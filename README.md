# [Dewei Personal Website](https://dliu.com)

## Link
Please visit my website at [dliu.com](https://dliu.com/)

## Hosting
The site is deployed as static files from `src/` to a private S3 bucket served through CloudFront. The CDK stack imports `MainDomain` and `MainHostedZoneId`, creates the ACM certificate in `us-east-1`, and points the Route 53 apex records at the CloudFront distribution.

## Continous Deployment
[Jenkins Build Pipeline](https://jenkins.dliu.com/job/home-site/)
