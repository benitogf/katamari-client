#!/usr/bin/env node

import { spawn, exec } from 'child_process'
import psTree from 'ps-tree'
import Jasmine, { ConsoleReporter } from 'jasmine'
import JasmineConsoleReporter from 'jasmine-console-reporter'
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let startServer = false
let buildDone = false

// https://github.com/nodejs/node/issues/3617#issuecomment-377731194
const kill = (pid) => new Promise((resolve) => {
    var isWin = /^win/.test(process.platform)
    if (!isWin) {
        psTree(pid, (_err, children) => {
            spawn('kill', ['-9'].concat(children.map((p) => p.PID)))
            resolve()
        })
    } else {
        exec('taskkill /PID ' + pid + ' /T /F')
        resolve()
    }
})

const build = spawn('npm run build', { shell: true })
build.stdout.on('close', () => {
    if (!buildDone) {
        buildDone = true
    }
})

const server = spawn('go', ['run', 'main.go'])
server.stdout.on('data', (data) => {
    if (!startServer) {
        console.log(`${data}`)
        startServer = true
    }
})
server.stderr.on('data', (e) => {
    console.log("err", `${e}`)
})

const app = express()
app.use(express.static(__dirname))
const htmlServer = app.listen(9468)

const spin = setInterval(async () => {
    if (startServer && htmlServer && buildDone) {
        clearInterval(spin)
        // setup Jasmine
        const jasmine = new Jasmine()
        jasmine.loadConfig({
            spec_dir: 'test',
            spec_files: ['**/*[sS]pec.js'],
            random: false,
            seed: null,
            stopSpecOnExpectationFailure: true
        })
        jasmine.jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
        jasmine.exitOnCompletion = false

        // setup console reporter
        const reporter = new JasmineConsoleReporter({
            colors: 1,           // (0|false)|(1|true)|2
            cleanStack: 1,       // (0|false)|(1|true)|2|3
            verbosity: 4,        // (0|false)|1|2|(3|true)|4|Object
            listStyle: 'indent', // "flat"|"indent"
            timeUnit: 'ms',      // "ms"|"ns"|"s"
            timeThreshold: { ok: 500, warn: 1000, ouch: 3000 }, // Object|Number
            activity: true,
            emoji: true,         // boolean or emoji-map object
            beep: true
        })

        // initialize and execute
        jasmine.env.clearReporters()
        jasmine.addReporter(reporter)
        await jasmine.execute()
        await kill(server.pid)
        htmlServer.close()
        process.exit()
    }
}, 10)