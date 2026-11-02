# Home Site CDK

This stack deploys the home site as static files from `../src` to a private S3 bucket behind CloudFront. It imports `MainDomain` and `MainHostedZoneId` for DNS, creates the CloudFront ACM certificate in `us-east-1`, and publishes Route 53 A/AAAA alias records for the zone apex.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm ci`          install dependencies from the lockfile
 * `npm test`        run the jest unit tests
 * `npm run synth`   emit the synthesized CloudFormation template
 * `npm run diff`    compare the deployed stack with the current app
 * `npm run deploy`  deploy this stack to the default AWS account/region
