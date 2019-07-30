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

  it('SA', async () => {
    const empty = { created: 0, updated: 0, index: '', data: {} }
    const aBox = { name: 'a box' }
    const stillAbox = { name: 'still a box' }
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const samo = Samo('localhost:8800/sa/box')
      let msgs = []
      samo.onopen = async () => {
        await samo.publish('sa', 'box', { name: 'a box' })
        await samo.publish('sa', 'box', { name: 'still a box' })
        await samo.unpublish('box')
      }
      samo.onmessage = async (msg) => {
        msgs.push(msg)
        if (msgs.length === 4) {
          samo.close(true)
          resolve(msgs)
        }
      }
      samo.onerror = (err) => {
        samo.close(true)
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

  it('MO', async () => {
    const something = { name: 'something' }
    const stillSomething = { name: 'still something' }
    const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
      const samo = Samo('localhost:8800/mo/box')
      let msgs = []
      samo.onopen = async () => {
        await samo.publish('mo', 'box', { name: 'something' }, '1') // create
        await samo.publish('mo', 'box', { name: 'still something' }, '1') // update
        await samo.unpublish('box/1') // delete
      }
      samo.onmessage = async (msg) => { // read
        msgs.push(msg)
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
    expect(result[1][0].index).toEqual('1')
    expect(result[1][0].data).toEqual(something)
    expect(result[2][0].created).toBeGreaterThan(0)
    expect(result[2][0].updated).toBeGreaterThan(0)
    expect(result[2][0].data).toEqual(stillSomething)
    expect(result[3].length).toEqual(0)
  })

})