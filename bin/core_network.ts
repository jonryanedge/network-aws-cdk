#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CoreNetworkStack } from '../lib/core_network-stack';

const app = new cdk.App();
new CoreNetworkStack(app, 'CoreNetworkStack');
