const level = require('level')
let levelDb

module.exports = dbDir => {
  if (!levelDb) {
    levelDb = level(dbDir)
  }
  return levelDb
}
