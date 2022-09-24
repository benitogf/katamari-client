import { launch } from 'puppeteer'
describe('Katamari', () => {
    let browser = undefined
    let page = undefined

    beforeEach(async () => {
        browser = await launch({ args: ['--disable-setuid-sandbox', '--no-sandbox'], dumpio: true })
        const url = `http://localhost:9468`
        page = await browser.newPage()
        await page.goto(url, { waitUntil: 'networkidle2' })
    })

    afterEach(async () => {
        if (browser) await browser.close()
    })

    it('object', async () => {
        const empty = { created: 0, updated: 0, index: '', data: {} }
        const state = [
            { name: 'a box 🧰' },
            { name: 'still a box 💾' }
        ]
        const result = await page.evaluate((state) => new Promise(async (resolve, reject) => {
            const copy = (a) => JSON.parse(JSON.stringify(a))
            const client = Katamari('localhost:8880/box')
            let msgs = []
            client.onopen = async () => {
                await client.publish('box', state[0]) // create
                await client.publish('box', state[1]) // update
                await client.unpublish('box') // delete
            }
            client.onmessage = (msg) => { // read
                msgs.push(copy(msg))
                if (msgs.length === 4) {
                    client.close()
                    resolve(msgs)
                }
            }
            client.onerror = (err) => {
                client.close()
                reject(err)
            }
        }), state)
        expect(result[0]).toEqual(empty)
        expect(result[1].created).toBeGreaterThan(0)
        expect(result[1].updated).toEqual(0)
        expect(result[1].index).toEqual('box')
        expect(result[1].data).toEqual(state[0])
        expect(result[2].created).toBeGreaterThan(0)
        expect(result[2].updated).toBeGreaterThan(0)
        expect(result[2].data).toEqual(state[1])
        expect(result[3]).toEqual(empty)
    })

    it('list', async () => {
        const state = [
            { name: 'something 🧰' },
            { name: 'still something 💾' }
        ]
        const result = await page.evaluate((state) => new Promise(async (resolve, reject) => {
            const copy = (a) => JSON.parse(JSON.stringify(a))
            const client = Katamari('localhost:8880/box/*')
            let msgs = []
            client.onopen = async () => {
                const id = await client.publish('box/*', state[0]) // create
                await client.publish('box/' + id, state[1]) // update
                await client.unpublish('box/' + id) // delete
            }
            client.onmessage = (msg) => { // read
                msgs.push(copy(msg))
                if (msgs.length === 4) {
                    client.close()
                    resolve(msgs)
                }
            }
            client.onerror = (err) => {
                client.close()
                reject(err)
            }
        }), state)
        expect(result[0].length).toEqual(0)
        expect(result[1][0].created).toBeGreaterThan(0)
        expect(result[1][0].updated).toEqual(0)
        expect(result[1][0].data).toEqual(state[0])
        expect(result[2][0].created).toBeGreaterThan(0)
        expect(result[2][0].updated).toBeGreaterThan(0)
        expect(result[2][0].data).toEqual(state[1])
        expect(result[3].length).toEqual(0)
    })

    it('list delete', async () => {
        const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
            const copy = (a) => JSON.parse(JSON.stringify(a))
            const client = Katamari('localhost:8880/things/*')
            let msgs = []
            let ops = []
            let ids = []
            const samples = 10
            for (let i = 0; i < samples; i++) {
                ops.push(i)
            }
            client.onopen = async () => {
                for (let op of ops) {
                    let id = await client.publish('things/*', { name: 'name' + op }) // create
                    ids.push(id)
                }
                for (let id of ids) {
                    await client.publish('things/' + id, { name: 'name' + id }) // update
                }
                await client.unpublish('things/*') // delete
            }
            client.onmessage = (msg) => { // read
                msgs.push(copy(msg))
                if (msgs.length === samples * 2 + 2) {
                    client.close()
                    resolve(msgs)
                }
            }
            client.onerror = (err) => {
                client.close()
                reject(err)
            }
        }))
        expect(result[0].length).toEqual(0)
        expect(result[result.length - 1].length).toEqual(0)
    })

    it('time', async () => {
        const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
            const copy = (a) => JSON.parse(JSON.stringify(a))
            const client = Katamari('localhost:8880')
            let msgs = []
            client.onmessage = (msg) => { // read
                msgs.push(copy(msg))
                if (msgs.length === 2) {
                    client.close()
                    resolve(msgs)
                }
            }
            client.onerror = (err) => {
                client.close()
                reject(err)
            }
        }))
        expect(result[0]).toBeGreaterThan(0)
        expect(result[1]).toBeGreaterThan(0)
    })

    it('reconnect', async () => {
        const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
            const client = Katamari('localhost:8880/test')
            let open = []
            client.onopen = () => {
                open.push(true)
                if (open.length === 2) {
                    open.push(client.ws.url)
                    client.close()
                    resolve(open)
                }
            }
            client.onmessage = (msg) => { // read
                if (open.length === 1) {
                    client.close(true)
                }
            }
            client.onerror = (err) => {
                client.close()
                reject(err)
            }
        }))
        expect(result.length).toEqual(3)
        expect(result[2].indexOf('?v=')).toBeGreaterThan(-1)
    })

    it('lifecycle', async () => {
        const result = await page.evaluate(() => new Promise(async (resolve, reject) => {
            const client = Katamari('localhost:8880/test')
            let open = []
            client.onopen = () => {
                open.push(true)
                if (open.length === 2) {
                    open.push(client.ws.url)
                    client.close()
                    resolve(open)
                }
            }
            client.onmessage = (msg) => { // read
                if (open.length === 1) {
                    document.dispatchEvent(new Event('freeze'))
                    setTimeout(() => {
                        document.dispatchEvent(new Event('resume'))
                    }, 300)
                }
            }
            client.onerror = (err) => {
                client.close()
                reject(err)
            }
        }))
        expect(result.length).toEqual(3)
        expect(result[2].indexOf('?v=')).toBeGreaterThan(-1)
    })

    it('keys', async () => {
        const result = await page.evaluate(() => new Promise(async (resolve) => {
            const client = Katamari()
            client.httpUrl = 'http://localhost:8880'
            let result = []
            let stats = await client.stats()
            result.push(stats.keys)
            await client.publish('box', { name: 'a box' }) // create
            stats = await client.stats()
            result.push(stats.keys)
            await client.unpublish('box') // delete
            stats = await client.stats()
            result.push(stats.keys)
            resolve(result)
        }))
        expect(result.length).toEqual(3)
        expect(result[0].length).toEqual(0)
        expect(result[1].length).toEqual(1)
        expect(result[1][0]).toEqual('box')
        expect(result[2].length).toEqual(0)
    })

    it('get', async () => {
        const result = await page.evaluate(() => new Promise(async (resolve) => {
            const client = Katamari()
            client.httpUrl = 'http://localhost:8880'
            let result = []
            let items = await client.get('*')
            result.push(items)
            await client.publish('box', { name: 'a box' }) // create
            items = await client.get('*')
            result.push(items)
            await client.unpublish('box') // delete
            items = await client.get('*')
            result.push(items)
            await client.publish('box/1/things/1', { name: 'a thing in box 1' }) // create
            items = await client.get('box/*/things/*')
            result.push(items)
            await client.publish('box/2/things/0', { name: 'a thing in box 2' }) // create
            items = await client.get('box/*/things/*')
            result.push(items)
            items = await client.get('box/2/things/0')
            result.push(items)
            resolve(result)
        }))
        expect(result.length).toEqual(6)
        expect(result[0].length).toEqual(0)
        expect(result[1].length).toEqual(1)
        expect(result[1][0].data.name).toEqual('a box')
        expect(result[2].length).toEqual(0)
        expect(result[3].length).toEqual(1)
        expect(result[3][0].data.name).toEqual('a thing in box 1')
        expect(result[4].length).toEqual(2)
        expect(result[4][0].data.name).toEqual('a thing in box 2')
        expect(result[5].data.name).toEqual('a thing in box 2')
    })
})