// https://github.com/daviddoran/typescript-reconnecting-websocket/blob/master/reconnecting-websocket.ts
import { Base64 } from 'js-base64'
import ky from 'ky'
const Samo = {
  // Time to wait before attempting reconnect (after close)
  reconnectInterval: 1000,
  // Time to wait for WebSocket to open (before aborting and retrying)
  timeoutInterval: 2000,

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
  wsProtocol: 'ws://',

  // http api
  apiProtocol: 'http://',


  // Set up the default 'noop' event handlers
  onopen: (ev) => { },
  onclose: (ev) => { },
  onconnecting: (ev) => { },
  onmessage: (ev) => { },
  onerror: (ev) => { },

  connect(reconnectAttempt) {
    this.ws = new WebSocket(this.wsUrl, this.protocols);

    this.onconnecting();

    var localWs = this.ws;
    var timeout = setTimeout(
      () => {
        this.timedOut = true;
        localWs.close();
        this.timedOut = false;
      },
      this.timeoutInterval);

    this.ws.onopen = (event) => {
      clearTimeout(timeout);
      this.readyState = WebSocket.OPEN;
      reconnectAttempt = false;
      this.onopen(event);
    };

    this.ws.onclose = (event) => {
      clearTimeout(timeout);
      // this.ws = null;
      if (this.forcedClose) {
        this.readyState = WebSocket.CLOSED;
        this.onclose(event);
      } else {
        this.readyState = WebSocket.CONNECTING;
        this.onconnecting();
        if (!reconnectAttempt && !this.timedOut) {
          this.onclose(event);
        }
        setTimeout(
          () => {
            this.connect(true);
          },
          this.reconnectInterval);
      }
    };
    this.ws.onmessage = (event) => {
      this.onmessage(event);
    };
    this.ws.onerror = (event) => {
      this.onerror(event);
    };
  },

  send(data) {
    if (this.ws) {
      return this.ws.send(data);
    } else {
      throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
    }
  },

  del(index) {
    if (this.ws) {
      const data = JSON.stringify({
        op: "del",
        index
      })
      return this.ws.send(data);
    } else {
      throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
    }
  },

  set(data, index) {
    if (this.ws) {
      return this.ws.send(this.encode(data, index));
    } else {
      throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
    }
  },

  /**
   * Returns boolean, whether websocket was FORCEFULLY closed.
   */
  close(force, url) {
    if (url !== undefined && force) {
      this.wsUrl = url;
    }
    if (this.ws) {
      this.forcedClose = !force;
      this.ws.close();
      return true;
    }
    return false;
  },

  /**
   * Additional public API method to refresh the connection if still open (close, re-open).
   * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
   *
   * Returns boolean, whether websocket was closed.
   */
  refresh() {
    if (this.ws) {
      this.ws.close();
      return true;
    }
    return false;
  },

  decode(evt) {
    const msg = Base64.decode(JSON.parse(evt.data).data)
    const data = msg !== '' ? JSON.parse(msg) : { created: 0, updated: 0, index: '', data: 'e30=' }
    const mode = evt.currentTarget.url.replace(this.wsProtocol + this.domain + '/', '').split('/')[0]
    return this._decode(mode, data)
  },

  _decode(mode, data) {
    return (mode === 'sa') ? Object.assign(data, { data: JSON.parse(Base64.decode(data['data'])) }) :
      Array.isArray(data) ?
        data.map((obj) => {
          obj['data'] = JSON.parse(Base64.decode(obj['data']))
          return obj
        }) : []
  },

  encode(data, index) {
    return JSON.stringify({
      data: Base64.encode(JSON.stringify(data)),
      index
    })
  },

  async rstats(optionalAddress) {
    const res = await ky.get(
      this.apiProtocol + ((optionalAddress) ? optionalAddress : this.domain)).json();

    return res
  },

  async rget(mode, key, optionalAddress) {
    const data = await ky.get(
      this.apiProtocol + ((optionalAddress) ? optionalAddress : this.domain) + '/r/' + mode + '/' + key).json();
    return this._decode(mode, data)
  },

  async rpost(mode, key, data, optionalIndex, optionalAddress) {
    const res = await ky.post(
      this.apiProtocol + ((optionalAddress) ? optionalAddress : this.domain) + '/r/' + mode + '/' + key,
      {
        json: {
          index: optionalIndex,
          data: Base64.encode(JSON.stringify(data))
        }
      }
    ).json();

    return res.index
  },

  async rdel(key, optionalAddress) {
    return ky.delete(
      this.apiProtocol +
      ((optionalAddress) ? optionalAddress : this.domain) +
      '/r/' + key);
  },

  parseTime: (evt) => parseInt(JSON.parse(evt.data).data)
}
export default function (url, protocols = [], ssl) {
  var e = Object.assign({}, Samo)
  e.domain = url.split('/')[0]
  e.wsProtocol = ssl ? 'wss://' : 'ws://'
  e.apiProtocol = ssl ? 'https://' : 'http://'
  e.wsUrl = e.wsProtocol + url
  e.protocols = protocols
  e.readyState = WebSocket.CONNECTING
  e.connect(false) // initialize connection
  return e
}