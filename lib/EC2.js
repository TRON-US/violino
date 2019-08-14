const AWS = require('aws-sdk')
AWS.config.setPromisesDependency(require('bluebird'))
const _ = require('lodash')

class EC2 {
  constructor(region) {
    this.region = region

    AWS.config.update({
      region: region,
      credentials: {
        accessKeyId: process.env.AWSAccessKeyID,
        secretAccessKey: process.env.AWSSecretAccessKey
      }
    })

    this.ec2 = new AWS.EC2({apiVersion: '2016-11-15'})
    this.elbv2 = new AWS.ELBv2({apiVersion: '2015-12-01'})
  }

  async updateStatus(instanceId, new_status) {
    if (new_status && typeof new_status === 'string') {
      var params = {
        Resources: [instanceId],
        Tags: [{
          Key: 'Status',
          Value: new_status
        }]
      }
      await this.ec2.createTags(params).promise()
    }
  }

  async getStatus(instanceId) {
    const tags = await this.getTags(instanceId)
    return tags.Status
  }


  async getZoneProxy() {
    const data = await this.ec2.describeInstances({DryRun: false}).promise()
    const proxies = []
    data.Reservations.forEach((item) => {
      item.Instances[0].Tags.forEach((tag) => {
        if (tag.Key === 'Type' && /zoneproxy/i.test(tag.Value)) {
          proxies.push(item.Instances[0]['PublicIpAddress'])
        }
      })
    })
    return proxies
  }

  async getGrpcProxy(network) {
    const data = await this.ec2.describeInstances({DryRun: false}).promise()
    const elbs = []
    data.TargetGroups.forEach((item) => {
      if (!!~item.TargetGroupName.indexOf(network) && (item.Port === 50051 || item.Port === 50052)) {
        elbs.push(item)
      }
    })
    return elbs
  }

  async get() {
    const data = await this.elbv2.describeTargetGroups({DryRun: false}).promise()
    const proxies = []
    data.Reservations.forEach((item) => {
      item.Instances[0].Tags.forEach((tag) => {
        if (tag.Key === 'Type' && /zoneproxy/i.test(tag.Value)) {
          proxies.push(item.Instances[0]['PublicIpAddress'])
        }
      })
    })
    return proxies
  }

  async getAllInstances() {
    const data = await this.ec2.describeInstances({DryRun: false}).promise()
    const instances = []
    data.Reservations.forEach((item) => {
      let d = {
        tags: {}
      }
      item.Instances[0].Tags.forEach((tag) => {
        if (tag.Key === 'Name') {
          d.name = tag.Value
          d.pip = item.Instances[0]['PublicIpAddress']
          d.iip = item.Instances[0]['PrivateIpAddress']

        } else {
          d.tags[tag.Key] = tag.Value
        }
      })
      instances.push(d)

  })
    return instances
  }

  async getNodeIP() {
    const all = await this.getAllInstances()
    let ips = {}
    for (let ec2 of all) {
      if (/^[OFS]{1}[AMSX]{1}-[a-zA-Z]+-[0-9]{1,2}$/.test(ec2.name)) {
        let regionAndUsage = ec2.name.substring(0, 2)
        let type = ec2.name.split('-')[1]
        if (!ips[type]) {
          ips[type] = {}
        }
        if (!ips[type][regionAndUsage]) {
          ips[type][regionAndUsage] = []
        }
        ips[type][regionAndUsage].push(ec2.pip)
      }
    }
    return ips
  }

  async healthyNodesCount(tags) {
    const data = await this.ec2.describeInstances({DryRun: false}).promise()
    let count = 0
    data.Reservations.forEach((item) => {
      let passes = 1
      item.Instances[0].Tags.forEach((tag) => {
        switch (tag.Key) {
          case 'Type':
            passes &= tag.Value === tags.Type
            break
          case 'Status':
            passes &= tag.Value === 'active'
            break
          case 'Usage':
            passes &= tag.Value === tags.Usage
            break
          default:
            break
        }
      })
      if (passes === 1) count++
    })
    return count
  }

  async getTags(instanceId) {
    const data = await this.ec2.describeInstances({InstanceIds: [instanceId]}).promise()
    let tags = {}
    data.Reservations[0].Instances[0].Tags.forEach((item) => {
      tags[item.Key] = item.Value
    })
    return tags
  }
}

module.exports = EC2
