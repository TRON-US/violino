const chalk = require('chalk')
const defaultLogLevel = 'info'
let logLevel = defaultLogLevel

//
// Available level methods:
//
//      Logger.trace(label, object)
//      Logger.debug(label, object)
//      Logger.warn(label, object)
//      Logger.error(label, object)
//      Logger.fatal(label, object)
//      Logger.magic(label, object)
//
//      magic is supposed to be used in development to see specific logs and, if needed, only them
//

const LOG_LEVELS = 'trace.debug.info.warn.error.fatal.magic'.split('.')
const COLORS = 'gray.green.black.yellow.red.magenta.blue'.split('.')
const BOLDS = '.....+.+'.split('.')

function logIf(level) {
  if (process.env.logLevel && LOG_LEVELS.includes(process.env.logLevel)) {
    logLevel = process.env.logLevel
  }
  return LOG_LEVELS.indexOf(logLevel) <= LOG_LEVELS.indexOf(level)
}

/* eslint-disable no-console */

function log(level, str, obj) {
  let l = LOG_LEVELS.indexOf(level)
  let c = chalk
  if (BOLDS[l]) {
    c = chalk.bold
  }
  if (typeof str !== 'string') {
    obj = str
    str = undefined
  }
  if (obj && obj instanceof Error) {
    level = 'error'
  }
  const colorFn = c[COLORS[l]]
  if (str) {
    str = (new Date()).toISOString().substring(0, 19)+ ' '+ level.toUpperCase() +': ' + str
    console.log(colorFn(str))
  }
  if (obj) {
    if (obj instanceof Error) {
      console.log('What is that object...', obj.toString())
      obj = JSON.stringify(obj, null, 2)
      console.log(colorFn('Message: ' + obj.message))
      console.log(colorFn(obj.stack))
    } else {
      console.log(colorFn(JSON.stringify(obj, null, 2)))
    }
  }
}

const Logger = {
  setLevel: function setLevel(level) {
    delete process.env.logLevel
    logLevel = level
  },
  resetLevel: function resetLevel() {
    delete process.env.logLevel
    logLevel = defaultLogLevel
  }
}

LOG_LEVELS.map(function (logLevel) {
  Logger[logLevel] = function (str, obj) {
    if (logIf(logLevel)) {
      log(logLevel, str, obj)
    }
  }
})

module.exports = Logger
