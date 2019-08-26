# katamari-client

[![Build Status][build-image]][build-url]


[build-url]: https://travis-ci.com/benitogf/katamari-client
[build-image]: https://api.travis-ci.com/benitogf/katamari-client.svg?branch=master&style=flat-square

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/katamari-client.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/katamari-client

js client for [katamari](https://github.com/benitogf/katamari) though the service should be usable with the [standard websocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [http/fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) request method, this client provides encode/decode methods and a reconnecting websocket abstraction.

Messages will arrive either as a snapshot or a [patch](https://json-patch-builder-online.github.io/) the subscription keeps a cache of the latest state.

## how to

### install
```bash
npm i katamari-client
```

#### object
```js
import Katamari from 'katamari-client'

const client = Katamari('localhost:8800/box')
let msgs = []
client.onopen = async () => {
  await client.publish('box', { name: 'something 🧰' }) // create
  await client.publish('box', { name: 'still something 💾' }) // update
  await client.unpublish('box') // delete
}
client.onmessage = async (msg) => { // read
  msgs.push(msg)
  if (msgs.length === 4) {
    client.close()
    console.log(msgs)
  }
}
client.onerror = (err) => {
  client.close()
}
```

#### list
```js
import Katamari from 'katamari-client'

const client = Katamari('localhost:8800/box/*')
let msgs = []
client.onopen = async () => {
  const id = await client.publish('box/*', { name: 'something 🧰' }) // create
  await client.publish('box/' + id, { name: 'still something 💾' }) // update
  await client.publish('box/custom', { name: 'custom something 🧰' }) // create
  await client.unpublish('box/*') // delete list
}
client.onmessage = async (msg) => { // read
  msgs.push(msg)
  if (msgs.length === 5) {
    client.close()
    console.log(msgs)
  }
}
client.onerror = (err) => {
  client.close()
}
```



