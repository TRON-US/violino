const {execSync} = require('child_process')
const Logger = require('./Logger')

function cmdExec(what) {
  try {
    Logger.trace('Executing', what)
    return execSync(what).toString().split('\n')
  } catch(err) {
    // Logger.error(err)
    return []
  }
}

module.exports = cmdExec
