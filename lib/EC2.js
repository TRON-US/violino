const AWS = require('aws-sdk')
AWS.config.setPromisesDependency(require('bluebird'))
const _ = require('lodash')
const camelCase = require('camel-case')

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
            for (let k = 0; k < item.Instances.length; k++) {
                item.Instances[k].Tags.forEach((tag) => {
                    if (tag.Key === 'Type' && /zoneproxy/i.test(tag.Value)) {
                        proxies.push(item.Instances[k]['PublicIpAddress'])
                    }
                })
            }
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
            for (let k = 0; k < item.Instances.length; k++) {
                item.Instances[k].Tags.forEach((tag) => {
                    if (tag.Key === 'Type' && /zoneproxy/i.test(tag.Value)) {
                        proxies.push(item.Instances[k]['PublicIpAddress'])
                    }
                })
            }
        })
        return proxies
    }

    async getAllTargetGroups() {
        return (await this.elbv2.describeTargetGroups().promise())['TargetGroups']
    }

    async getAllInstances() {
        const data = await this.ec2.describeInstances({DryRun: false}).promise()
        const instances = []
        data.Reservations.forEach((item) => {
            for (let k = 0; k < item.Instances.length; k++) {
                let d = {}
                item.Instances[k].Tags.forEach((tag) => {
                    if (tag.Key === 'Name') {
                        d.name = tag.Value
                        d.pip = item.Instances[k]['PublicIpAddress']
                        d.iip = item.Instances[k]['PrivateIpAddress']
                    } else {
                        d[camelCase(tag.Key.toLowerCase())] = tag.Value
                    }
                })
                instances.push(d)
            }
        })
        return instances
    }

    async getInstanceByPIP(publicIP) {
        const data = await this.ec2.describeInstances({DryRun: false}).promise()
        let instanceInfo = {}
        data.Reservations.forEach((item) => {
            for (let d of item.Instances) {
                if (d['PublicIpAddress'] && d['PublicIpAddress'] === publicIP) {
                    instanceInfo.instanceId = d['InstanceId']
                    instanceInfo.instanceType = d['InstanceType']
                    instanceInfo.keyName = d['KeyName']
                    instanceInfo.pip = d['PublicIpAddress']
                    instanceInfo.iip = d['PrivateIpAddress']
                    instanceInfo.subNetId = d['SubnetId']
                    instanceInfo.vpcId = d['VpcId']
                    instanceInfo.securityGroups = d['SecurityGroups']
                    instanceInfo.state = d['State']['Name']
                    instanceInfo.tags = {}
                    for (let tag of d['Tags']) {
                        let key = tag['Key']
                        let val = tag['Value']
                        if (key === 'Load Balancer') {
                            instanceInfo.tags.grpcLb = val
                        } else if (key === 'Type') {
                            instanceInfo.tags.type = val
                        } else if (key === 'Upstream') {
                            instanceInfo.tags.upstream = val
                        } else if (key === 'Usage') {
                            instanceInfo.tags.usage = val
                        } else if (key === 'Name') {
                            instanceInfo.name = val
                        } else {
                        }
                    }
                }
            }
        })
        return instanceInfo
    }

    async getInstanceByName(name) {
        const data = await this.ec2.describeInstances({DryRun: false}).promise()
        let instanceInfo = {}
        data.Reservations.forEach((item) => {
            for (let d of item.Instances) {
                for (let tag of d['Tags']) {
                    let key = tag['Key']
                    let val = tag['Value']
                    if (key === 'Name' && val === name) {
                        instanceInfo.instanceId = d['InstanceId']
                        instanceInfo.instanceType = d['InstanceType']
                        instanceInfo.keyName = d['KeyName']
                        instanceInfo.pip = d['PublicIpAddress']
                        instanceInfo.iip = d['PrivateIpAddress']
                        instanceInfo.subNetId = d['SubnetId']
                        instanceInfo.vpcId = d['VpcId']
                        instanceInfo.securityGroups = d['SecurityGroups']
                        instanceInfo.state = d['State']['Name']
                        instanceInfo.tags = {}
                        d['Tags'].forEach(tag => {
                            let key = tag['Key']
                            let val = tag['Value']
                            if (key === 'Load Balancer') {
                                instanceInfo.tags.grpcLb = val
                            } else if (key === 'Type') {
                                instanceInfo.tags.type = val
                            } else if (key === 'Upstream') {
                                instanceInfo.tags.upstream = val
                            } else if (key === 'Usage') {
                                instanceInfo.tags.usage = val
                            } else if (key === 'Name') {
                                instanceInfo.name = val
                            } else {
                            }
                        })
                    }
                }
            }
        })
        return instanceInfo
    }

    async isInstanceHealth(instanceId, options) {
        const data = await this.ec2.describeInstanceStatus({
            InstanceIds: [ instanceId ],
            DryRun: false
        }).promise()
        const status = data['InstanceStatuses'][0]
        if (status['InstanceState']['Name'] !== 'running' || status['InstanceStatus']['Status'] !== 'ok' || status['SystemStatus']['Status'] !== 'ok') {
            return false
        }
        return true
    }

    async getImageByAttributeValue(value, options) {
        let filters = [ {Name: 'image-type', Values: ['machine']} ]
        if (options.name) {
            filters.push({ Name: 'name', Values: [value]})
        }
        if (options.description) {
            filters.push({ Name: 'description', Values: [value]})
        }
        return (await this.ec2.describeImages({
            DryRun: false,
            Filters: filters
        }).promise())['Images']
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
            for (let k = 0; k < item.Instances.length; k++) {
                let passes = 1
                item.Instances[k].Tags.forEach((tag) => {
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
            }
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
