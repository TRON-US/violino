const express = require('express')
const Logger = require('./Logger')
const errors = require('./errors')

class HttpServer {

  constructor(name, port, routes) {
    this.name = name
    this.port = port
    this.app = express()
    this.isListening = false
    routes(this.app)

    this.app.all('/404', function (req, res) {
      res.status(404).json(errors['404'])
    })

    this.app.get('/500', function (req, res) {
      res.status(500).json(errors['500'])
    })

    this.app.all('*', function (req, res) {
      res.redirect('/404')
    })
  }

  start() {
    if (!this.isListening) {
      try {
        this.server = this.app.listen(this.port)
        this.isListening = true
        Logger.info(`${this.name} listening on port ${this.port}`)
      } catch (err) {
        Logger.error(err)
      }
    } else {
      Logger.info(`${this.name} already listening on port ${this.port}`)
    }
  }

  async stop() {
    if (this.isListening) {
      try {
        Logger.info(`Stopping ${this.name}...`)
        this.server.close()
        this.isListening = false
        Logger.info(`${this.name} stopped.`)
      } catch (err) {
      }
    } else {
      Logger.info(`${this.name} already stopped.`)
    }
  }
}

module.exports = HttpServer
