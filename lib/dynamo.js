const _ = require('lodash')
const AWS = require('aws-sdk')
AWS.config.setPromisesDependency(require('bluebird'))

class Dynamo {

  constructor(config) {
    AWS.config.update({
      region: config.AWSRegion,
      credentials: {
        accessKeyId: config.AWSAccessKeyID,
        secretAccessKey: config.AWSSecretAccessKey
      }
    })
    this.ddb = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'})
    this.cache = {
      all: null,
      ts: 0
    }
  }

  async put(Item) {
    return await this.ddb.put({
      TableName: 'network_info',
      Item
    }).promise()
  }

  async get(Key) {
    return await this.ddb.get({
      TableName: 'network_info',
      Key
    }).promise()
  }

  async update(Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues) {
    return await this.ddb.update({
      TableName: 'network_info',
      Key,
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    }).promise()
  }

  async filter(filter) {
    const all = await this.all()
    return _.filter(all.Items, filter)
  }

  async delete(Key) {
    return await this.ddb.delete({
      TableName: 'network_info',
      Key
    }).promise()
  }

  async all() {
    if (this.cache.all && this.cache.ts > Date.now() - 1000) {
      return this.cache.all
    }
    const all = await this.ddb.scan({
      TableName: 'network_info',
      ProjectionExpression: '#r, ip, #t, #a, #us, #up, #lb, #ii, #d, #id, #s',
      ExpressionAttributeNames: {
        '#r': "region",
        '#t': 'type',
        '#a': 'instance_type',
        '#us': 'usage',
        '#up': 'upstream',
        '#lb': 'load_balancer',
        '#ii': 'internal_ip',
        '#id': 'instance_id',
        '#d': 'deprecated',
        '#s': 'status'
      }
    }).promise()
    this.cache = {
      all,
      ts: Date.now()
    }
    return all
  }

  async getEc2(region) {
    if (region) {
      AWS.config.update({
        region
      })
    }
    let ec2 = new AWS.EC2({apiVersion: '2016-11-15'})
    let data = await ec2.describeInstances({}).promise()
    if (region) {
      AWS.config.update({
        region: process.env.AWSRegion
      })
    }
    return data.Reservations
  }

}

module.exports = Dynamo