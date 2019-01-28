# samo-js-client

js client for [samo](https://github.com/benitogf/samo) though the service should be usable with the [standard websocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [http/fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) request method, this client provides encode/decode methods and a reconnecting websocket abstraction, more of a template than a library.

## how to

### install
```bash
npm i samo-js-client
```

### use
```js
import Samo from 'samo-js-client'

const address = 'localhost:8800'
const boxes = new Samo(
    address + '/mo/boxes'
)
boxes.onopen = async (evt) => {
    console.info(evt)
    // set through websocket
    // set(data, index: optional)
    // there is no direct callback
    // if no index is specified like bellow
    // it will be autogenerated
    boxes.set({ name: "a box" }, "1")
    // post through http
    // rpost(mide, key, data, index: : optional, address: optional)
    // the websocket connection is related to a key
    // but the restful api is not, so we need to provide
    // the key again
    const boxID = await boxes.rpost('mo', 'boxes', {
        name: "other box"
    }, "other")
    console.log(boxID === "other")
    // you can have a websocket client
    // and through http interact in a different mode or
    // with a different key
    const moreBoxID = await boxes.rpost('sa', 'boxes/9', {
        name: "box#9"
    })
    console.log(moreBoxID === "9")
    // get through http
    // rget(mode, key)
    const boxNumerNine = await boxes.rget('sa', 'boxes/9')
    console.log(boxNumerNine.index === "9")
    const allTheBoxes = await boxes.rget('mo', 'boxes')
    console.log(allTheBoxes.length === 3)
    // delete through websocket
    boxes.del(moreBoxID)
    boxes.del('1')
    // delete through http
    await boxes.rdel('boxes/' + boxID)
}
boxes.onerror = (evt) => {
    console.info(evt)
}
boxes.onmessage = (evt) => {
    // a websocket connection will recieve base64 encoded data
    console.info(boxes.decode(evt))
}

```


# Other projects:
    a brief walthrough on similar projects clients

- [firebase](https://firebase.google.com/docs/database/)

	supports id creation as a separated operation, batch updates, path abstraction

```js
// https://firebase.google.com/docs/database/web/read-and-write
function writeNewPost(uid, username, picture, title, body) {
  // A post entry.
  var postData = {
    author: username,
    uid: uid,
    body: body,
    title: title,
    starCount: 0,
    authorPic: picture
  };

  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child('posts').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/posts/' + newPostKey] = postData;
  updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  return firebase.database().ref().update(updates);
}
```

- [emmiter](https://github.com/emitter-io/emitter)

	authorization is part of the message (key), doesn't support id generation, channel abstraction seems similar to paths

```js
// https://emitter.io/develop/javascript/
var client = emitter.connect();
client.publish({
	key: "<channel key>",
	channel: "chat/my_name",
	message: "hello, emitter!"
});
```
- [kuzzle](https://github.com/kuzzleio/kuzzle)

	promise based, collections and indexes abstraction

```js
// https://docs.kuzzle.io/guide/getting-started/
const kuzzle = new Kuzzle('localhost', {defaultIndex: 'playground'})
const message = {message: "Hello, World!"}
kuzzle.collection('mycollection')
  .createDocumentPromise(message)
  .then(res => {
    console.log('the following document has been successfully created:\n', message)
  })
  .catch(err => {
    console.error(err.message)
  })
  .finally(() => kuzzle.disconnect())
```



