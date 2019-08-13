const level = require('level')
const path = require('path')
const dbDir = path.resolve(__dirname, '../../db')
const db = level(dbDir)

module.exports = db
