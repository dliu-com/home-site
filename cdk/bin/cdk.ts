#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CdkStack } from '../lib/main-stack';

const app = new App();
new CdkStack(app, 'dliu-com', {
  tags: { service: 'dliu-com' },
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
