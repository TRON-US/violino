const level = require('level')
let db

module.exports = dbDir => {
  if (!db) {
    db = level(dbDir)
  }
  return db
}
