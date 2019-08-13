const superagent = require('superagent')
const fs = require('./fs')

class AwsMeta {

  async get(what) {
    let data = await superagent.get(`http://169.254.169.254/latest/meta-data/${what}`)
      .set('Accept', 'application/json')
    return data.res.text
  }

  async getZone() {
    let data = await this.get('placement/availability-zone')
    return data.substring(0, data.length - 1)
 }

  async getInstanceId() {
    return this.get('instance-id')
  }

  async getInstanceIp() {
    return this.get('public-ipv4')
  }

  async getInstancePrivateIp() {
    return this.get('local-ipv4')
  }

  isEc2() {
    return fs.existsSync('/home/ec2-user')
  }
}

module.exports = AwsMeta
