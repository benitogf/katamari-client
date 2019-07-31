const puppeteer = require('puppeteer')
describe('Samo', () => {
  let browser = undefined
  let page = undefined

  beforeEach(async () => {
    browser = await puppeteer.launch({ args: ['--disable-setuid-sandbox', '--no-sandbox'], dumpio: true })
    const url = `http://localhost:8080`
    page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2' })
  })

  afterEach(async () => {
    if (browser) await browser.close()
  })

  it('sa', async () => {
    const empty = { created: 0, updated: 0, index: '', data: {} }
    const aBox = { name: 'a box' }
    const stillAbox = { name: 'still a box' }
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const copy = (a) => JSON.parse(JSON.stringify(a))
      const samo = Samo('localhost:8800/sa/box')
      let msgs = []
      samo.onopen = async () => {
        await samo.publish('sa/box', { name: 'a box' }) // create
        await samo.publish('sa/box', { name: 'still a box' }) // update
        await samo.unpublish('box') // delete
      }
      samo.onmessage = (msg) => { // read
        msgs.push(copy(msg))
        if (msgs.length === 4) {
          samo.close()
          resolve(msgs)
        }
      }
      samo.onerror = (err) => {
        samo.close()
        reject(err)
      }
    }))
    expect(result[0]).toEqual(empty)
    expect(result[1].created).toBeGreaterThan(0)
    expect(result[1].updated).toEqual(0)
    expect(result[1].index).toEqual('box')
    expect(result[1].data).toEqual(aBox)
    expect(result[2].created).toBeGreaterThan(0)
    expect(result[2].updated).toBeGreaterThan(0)
    expect(result[2].data).toEqual(stillAbox)
    expect(result[3]).toEqual(empty)
  })

  it('mo', async () => {
    const something = { name: 'something' }
    const stillSomething = { name: 'still something' }
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const copy = (a) => JSON.parse(JSON.stringify(a))
      const samo = Samo('localhost:8800/mo/box')
      let msgs = []
      samo.onopen = async () => {
        const id = await samo.publish('mo/box', { name: 'something' }) // create
        await samo.publish('sa/box/' + id, { name: 'still something' }) // update
        await samo.unpublish('box/' + id) // delete
      }
      samo.onmessage = (msg) => { // read
        msgs.push(copy(msg))
        if (msgs.length === 4) {
          samo.close()
          resolve(msgs)
        }
      }
      samo.onerror = (err) => {
        samo.close()
        reject(err)
      }
    }))
    expect(result[0].length).toEqual(0)
    expect(result[1][0].created).toBeGreaterThan(0)
    expect(result[1][0].updated).toEqual(0)
    expect(result[1][0].data).toEqual(something)
    expect(result[2][0].created).toBeGreaterThan(0)
    expect(result[2][0].updated).toBeGreaterThan(0)
    expect(result[2][0].data).toEqual(stillSomething)
    expect(result[3].length).toEqual(0)
  })

  it('push', async () => {
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const copy = (a) => JSON.parse(JSON.stringify(a))
      const samo = Samo('localhost:8800/mo/things')
      let msgs = []
      let ops = []
      let ids = []
      const samples = 100
      for (let i = 0; i < samples; i++) {
        ops.push(i)
      }
      samo.onopen = async () => {
        for (let op of ops) {
          let id = await samo.publish('mo/things', { name: 'name' + op }) // create
          ids.push(id)
        }
        for (let id of ids) {
          await samo.publish('sa/things/' + id, { name: 'name' + id }) // update
        }
        for (let id of ids) {
          await samo.unpublish('things/' + id) // delete
        }
      }
      samo.onmessage = (msg) => { // read
        msgs.push(copy(msg))
        if (msgs.length === samples * 3 + 1) {
          samo.close()
          resolve(msgs)
        }
      }
      samo.onerror = (err) => {
        samo.close()
        reject(err)
      }
    }))
    expect(result[0].length).toEqual(0)
    expect(result[result.length - 1].length).toEqual(0)
  })

  it('time', async () => {
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const copy = (a) => JSON.parse(JSON.stringify(a))
      const samo = Samo('localhost:8800/time')
      let msgs = []
      samo.onmessage = (msg) => { // read
        msgs.push(copy(msg))
        if (msgs.length === 2) {
          samo.close()
          resolve(msgs)
        }
      }
      samo.onerror = (err) => {
        samo.close(true)
        reject(err)
      }
    }))
    expect(result[0]).toBeGreaterThan(0)
    expect(result[1]).toBeGreaterThan(0)
  })

  it('reconnect', async () => {
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const samo = Samo('localhost:8800/sa/test')
      let open = []
      samo.onopen = () => {
        open.push(true)
      }
      samo.onmessage = (msg) => { // read
        if (open.length === 1) {
          samo.close(true)
        }
        if (open.length === 2) {
          samo.close()
          resolve(open)
        }
      }
      samo.onerror = (err) => {
        samo.close(true)
        reject(err)
      }
    }))
    expect(result.length).toEqual(2)
  })
})