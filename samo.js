// https://github.com/daviddoran/typescript-reconnecting-websocket/blob/master/reconnecting-websocket.ts
import { Base64 } from 'js-base64'
import { applyPatch } from 'fast-json-patch'
import ky from 'ky'

// https://stackoverflow.com/questions/49123222/converting-array-buffer-to-string-maximum-call-stack-size-exceeded
const binArrayToJson = (buf) => {
  if ('TextDecoder' in window) {
    // Decode as UTF-8
    const dataView = new DataView(buf)
    const decoder = new TextDecoder('utf8')
    return JSON.parse(decoder.decode(dataView))
  } else {
    return JSON.parse(new Uint8Array(buf).reduce((data, byte) =>
      data + String.fromCharCode(byte),
      ''))
  }
}

const parseOps = (data) => JSON.parse(Base64.decode(data)).map(op => (
  op.op === 'add' ?
    {
      ...op,
      value: {
        ...op.value,
        data: JSON.parse(Base64.decode(op.value.data !== undefined ? op.value.data : op.value))
      }
    } : op.path.indexOf('data') !== -1 ?
      {
        ...op,
        value: JSON.parse(Base64.decode(typeof op.value === 'string' ? op.value : op.value.data !== undefined ? op.value.data : op.value))
      } : op))

const parseMsg = (mode, data) =>
  (mode === 'sa') ? Object.assign(data, { data: JSON.parse(Base64.decode(data['data'])) }) :
    Array.isArray(data) ?
      data.map((obj) => {
        obj['data'] = JSON.parse(Base64.decode(obj['data']))
        return obj
      }) : []

const copy = (a) => JSON.parse(JSON.stringify(a))

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
    this.onmessage(parseInt(binArrayToJson(event.data).data))
  },

  _data(event) {
    const msg = binArrayToJson(event.data)
    if (msg.snapshot) {
      const msgData = Base64.decode(msg.data)
      const data = msgData !== '' ? JSON.parse(msgData) : { created: 0, updated: 0, index: '', data: 'e30=' }
      this.cache = parseMsg(this.mode, data)
      this.onmessage(copy(this.cache))
      return
    }

    this.cache = applyPatch(this.cache, parseOps(msg.data)).newDocument
    this.onmessage(copy(this.cache))
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
  async get(mode, key) {
    const data = await ky.get(
      this.httpUrl + '/r/' + mode + '/' + key).json()
    return parseMsg(mode, data)
  },
  async publish(mode, key, data, index) {
    const res = await ky.post(
      this.httpUrl + '/r/' + mode + '/' + key,
      {
        json: {
          index: index,
          data: Base64.encode(JSON.stringify(data))
        }
      }
    ).json()

    return res.index
  },
  async unpublish(key) {
    return ky.delete(this.httpUrl + '/r/' + key)
  }
}
export default function (url, ssl, protocols = []) {
  let e = Object.assign({}, _samo)
  if (url !== undefined) {
    let urlSplit = url.split('/')
    e.domain = urlSplit[0]
    e.mode = urlSplit[1]
    let wsProtocol = ssl ? 'wss://' : 'ws://'
    let httpProtocol = ssl ? 'https://' : 'http://'
    e.httpUrl = httpProtocol + e.domain
    e.wsUrl = wsProtocol + url
    e.isTime = url === '/time'
    e.protocols = protocols
    e.readyState = WebSocket.CONNECTING
    e.connect(false) // initialize connection
  }
  return e
}
