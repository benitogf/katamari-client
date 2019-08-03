# samo-js-client

[![Build Status][build-image]][build-url]


[build-url]: https://travis-ci.com/benitogf/samo-js-client
[build-image]: https://api.travis-ci.com/benitogf/samo-js-client.svg?branch=master&style=flat-square

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/samo-js-client.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/samo-js-client

js client for [samo](https://github.com/benitogf/samo) though the service should be usable with the [standard websocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [http/fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) request method, this client provides encode/decode methods and a reconnecting websocket abstraction.

Messages will arrive either as a snapshot or a [patch](https://json-patch-builder-online.github.io/) the subscription keeps a cache of the latest state.

## how to

### install
```bash
npm i samo-js-client
```

#### object
```js
import Samo from 'samo-js-client'

const samo = Samo('localhost:8800/box')
let msgs = []
samo.onopen = async () => {
  await samo.publish('box', { name: "a box" }) // create
  await samo.publish('box', { name: "still a box" }) // update
  await samo.unpublish('box') // delete
}
samo.onmessage = async (msg) => { // read
  msgs.push(msg)
  if (msgs.length === 4) {
    samo.close()
    console.log(msgs)
  }
}
samo.onerror = (err) => {
  samo.close()
}
```

#### list
```js
import Samo from 'samo-js-client'

const samo = Samo('localhost:8800/box/*')
let msgs = []
samo.onopen = async () => {
  const id = await samo.publish('box/*', { name: "something" }) // create
  await samo.publish('box/' + id, { name: "still something" }) // update
  await samo.unpublish('box/'+id) // delete
}
samo.onmessage = async (msg) => { // read
  msgs.push(msg)
  if (msgs.length === 4) {
    samo.close()
    console.log(msgs)
  }
}
samo.onerror = (err) => {
  samo.close()
}
```



