#!/usr/bin/env node

const { spawn, exec } = require('child_process')
const psTree = require('ps-tree')
const Jasmine = require('jasmine')
const JasmineConsoleReporter = require('jasmine-console-reporter')
const express = require('express')

let startServer = false
let buildDone = false

// https://github.com/nodejs/node/issues/3617#issuecomment-377731194
const kill = (pid) => {
  var isWin = /^win/.test(process.platform)
  if (!isWin) {
    psTree(pid, (_err, children) => {
      spawn('kill', ['-9'].concat(children.map((p) => p.PID)))
    })
  } else {
    exec('taskkill /PID ' + pid + ' /T /F')
  }
}

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

const app = express()
app.use(express.static(__dirname))
const htmlServer = app.listen(9468)

const spin = setInterval(() => {
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
    jasmine.execute()
    jasmine.onComplete(() => {
      htmlServer.close()
      kill(server.pid)
    })
  }
}, 10)

function exitHandler(options) {
  if (options.cleanup) kill(server.pid)
  if (options.exit) process.exit()
}
process.on('exit', exitHandler.bind(null, { cleanup: true }))
process.on('SIGINT', exitHandler.bind(null, { exit: true }))
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
process.on('uncaughtException', exitHandler.bind(null, { exit: true }))