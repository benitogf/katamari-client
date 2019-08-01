// https://github.com/daviddoran/typescript-reconnecting-websocket/blob/master/reconnecting-websocket.ts
import { Base64 } from 'js-base64'
import { applyPatch } from 'fast-json-patch'
import ky from 'ky'

// https://stackoverflow.com/questions/49123222/converting-array-buffer-to-string-maximum-call-stack-size-exceeded
const binaryStringToString = (buf) => {
  if ('TextDecoder' in window) {
    // Decode as UTF-8
    const dataView = new DataView(buf)
    const decoder = new TextDecoder('utf8')
    return decoder.decode(dataView)
  }

  return new Uint8Array(buf).reduce((data, byte) =>
    data + String.fromCharCode(byte),
    '')
}

const binaryStringToObject = (buf) => JSON.parse(binaryStringToString(buf))

const binaryStringToInt = (buf) => parseInt(binaryStringToString(buf))

const b64toObject = (str) => JSON.parse(Base64.decode(str))

const objectToB64 = (obj) => Base64.encode(JSON.stringify(obj))

const parseOp = (op) => typeof op.value === 'string' ?
  op.value : op.value.data

const parseOpData = (op) => b64toObject(parseOp(op))

const parseOps = (data) => b64toObject(data).map(op => {
  if (op.op === 'add') {
    return {
      ...op,
      value: {
        ...op.value,
        data: parseOpData(op)
      }
    }
  }
  if (op.path.indexOf('data') !== -1) {
    return {
      ...op,
      value: parseOpData(op)
    }
  }
  return op
})

const parseMsg = (mode, msg) => {
  if (mode === 'sa') {
    return {
      ...msg,
      data: b64toObject(msg.data)
    }
  }

  return msg.map((obj) => ({
    ...obj,
    data: b64toObject(obj.data)
  }))
}

const _samo = {
  // cache
  cache: null,
  // Time to wait before attempting reconnect (after close)
  reconnectInterval: 3000,
  // Time to wait for WebSocket to open (before aborting and retrying)
  timeoutInterval: 5000,
  // Should only be used to read WebSocket readyState
  readyState: null,
  // Whether WebSocket was forced to close by this client
  forcedClose: false,
  // Whether WebSocket opening timed out
  timedOut: false,
  // List of WebSocket sub-protocols
  protocols: [],
  // The underlying WebSocket
  ws: null,
  wsUrl: null,
  httpUrl: null,
  mode: null,
  bound: false,
  frozen: false,
  isTime: false,
  // Set up the default 'noop' event handlers
  onopen: (event) => { },
  onclose: (event) => { },
  onconnecting: (event) => { },
  onmessage: (data) => { },
  onerror: (event) => { },
  onfrozen: (event) => { },
  onresume: (event) => { },

  _time(event) {
    this.onmessage(binaryStringToInt(event.data))
  },

  _patch(data) {
    const msg = binaryStringToObject(data)
    if (msg.snapshot) {
      const entryData = b64toObject(msg.data)
      this.cache = parseMsg(this.mode, entryData)
      return this.cache
    }

    const ops = parseOps(msg.data)
    this.cache = applyPatch(this.cache, ops).newDocument
    return this.cache
  },

  _data(event) {
    const patch = this._patch(event.data)
    this.onmessage(patch)
  },

  _onfrozen(event) {
    this.onfrozen(event)
    if (!this.frozen) {
      this.frozen = true
      if (this.ws) {
        this.readyState = WebSocket.CLOSING
        this.ws.close()
      }
    }
  },

  _onresume(event) {
    this.onresume(event)
    if (this.ws && (this.frozen || this.forcedClose) && this.readyState !== WebSocket.CLOSED && this.readyState !== WebSocket.CLOSING) {
      this.readyState = WebSocket.CLOSING
      this.ws.close()
    }
    if (this.frozen && !this.forcedClose) {
      const intervalID = window.setInterval(() => {
        if (this.readyState === WebSocket.CLOSED) {
          document.removeEventListener('resume', this._boundOnResume)
          this.connect()
          this.frozen = false
          clearInterval(intervalID)
        }
      }, 500)
    } else {
      if (this.forcedClose) {
        document.removeEventListener('resume', this._boundOnResume)
      }
    }
  },

  connect(reconnectAttempt) {
    this.ws = new WebSocket(this.wsUrl, this.protocols)
    this.ws.binaryType = "arraybuffer"

    this.onconnecting()

    const localWs = this.ws
    const timeout = setTimeout(
      () => {
        this.timedOut = true
        localWs.close()
        this.timedOut = false
      },
      this.timeoutInterval)

    this.ws.onopen = (event) => {
      clearTimeout(timeout)
      this.readyState = WebSocket.OPEN
      reconnectAttempt = false
      this.onopen(event)
    }

    this.ws.onclose = (event) => {
      clearTimeout(timeout)
      if (this.forcedClose || this.frozen) {
        this.readyState = WebSocket.CLOSED
        this.ws = null
        document.removeEventListener('freeze', this._boundOnFrozen)
        document.removeEventListener('pause', this._boundOnFrozen)
        this.onclose(event)
        return
      }

      this.readyState = WebSocket.CONNECTING
      this.onconnecting()
      if (!reconnectAttempt && !this.timedOut) {
        this.onclose(event)
      }
      setTimeout(
        () => {
          this.connect(true)
        },
        this.reconnectInterval)
    }

    this.ws.onmessage = (event) => this.isTime ? this._time(event) : this._data(event)
    this.ws.onerror = this.onerror


    if (!this.bound) {
      this._boundOnFrozen = this._onfrozen.bind(this)
      this._boundOnResume = this._onresume.bind(this)
      this.bound = true
    }
    // https://wicg.github.io/page-lifecycle/spec.html#html-task-source-dfn
    // https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#lifecycle-guide
    document.addEventListener('freeze', this._boundOnFrozen, { capture: true, once: true })

    // https://github.com/apache/cordova-browser/issues/79
    if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
      document.addEventListener('pause', this._boundOnFrozen, { capture: true, once: true })
    }
    document.addEventListener('resume', this._boundOnResume, { capture: true })
  },
  close(reload) {
    if (this.ws) {
      this.forcedClose = !reload
      this.readyState = WebSocket.CLOSING
      this.ws.close()
      return true
    }
    return false
  },
  async stats() {
    return ky.get(this.httpUrl).json()
  },
  async get(key) {
    const urlSplit = url.split('/')
    const mode = urlSplit[0]
    const data = await ky.get(this.httpUrl + '/r/' + key).json()
    return parseMsg(mode, data)
  },
  async publish(key, data) {
    const res = await ky.post(
      this.httpUrl + '/r/' + key, {
        json: {
          data: objectToB64(data)
        }
      }
    ).json()

    return res.index
  },
  async unpublish(key) {
    return ky.delete(this.httpUrl + '/r/' + key)
  }
}
export default function (url, ssl, protocols = [], closed) {
  let e = Object.assign({}, _samo)
  if (!closed) {
    let urlSplit = url.split('/')
    e.domain = urlSplit[0]
    e.mode = urlSplit[1]
    let wsProtocol = ssl ? 'wss://' : 'ws://'
    let httpProtocol = ssl ? 'https://' : 'http://'
    e.httpUrl = httpProtocol + e.domain
    e.wsUrl = wsProtocol + url
    e.isTime = urlSplit[1] === 'time'
    e.protocols = protocols
    e.readyState = WebSocket.CONNECTING
    e.connect(false) // initialize connection
    return e
  }

  let httpProtocol = ssl ? 'https://' : 'http://'
  e.httpUrl = httpProtocol + url
  return e
}
