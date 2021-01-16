#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CoreNetworkStack } from '../lib/core_network-stack';
import { CoreVpcStack } from '../lib/core_vpc-stack';
import { EdgeVpcStack } from '../lib/edge_vpc-stack';

const deploymentId = 'test';
const azs = [ 'us-west-2a', 'us-west-2b', 'us-west-2c' ];
const regionAsn = 65500;
const regionIp = '10.0.0.0/16';
const coreIp = '10.0.0.0/22';
const edgeIp = '10.0.4.0/22';
const cores = [ '10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24' ];
const edges = [ '10.0.4.0/24', '10.0.6.0/24' ];
const nats = [ '10.0.5.0/24', '10.0.7.0/24' ];

const env = {
    region: 'us-west-2',
    account: process.env.CDK_DEFAULT_ACCOUNT,
}

const app = new cdk.App();
new CoreNetworkStack(app, 'router', {
    env: env,
    deploymentId: deploymentId,
    regionAsn: regionAsn,
    regionCidr: regionIp,
});

new CoreVpcStack(app, 'core', {
    env: env,
    deploymentId: deploymentId,
    regionCidr: regionIp,
    vpcCidr: coreIp,
    subnetAzs: azs,
    subnetCidrs: cores
});

new EdgeVpcStack(app, 'edge', {
    env: env,
    deploymentId: deploymentId,
    regionCidr: regionIp,
    edgeCidr: edgeIp,
    subnetAzs: azs,
    pubCidrs: edges,
    privCidrs: nats
});

