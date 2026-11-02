# [Dewei Personal Website](https://dliu.com)

## Link
Please visit my website at [dliu.com](https://dliu.com/)

## Hosting
The site is deployed as static files from `src/` to a private S3 bucket served through CloudFront. The CDK stack imports `MainDomain` and `MainHostedZoneId`, creates the ACM certificate in `us-east-1`, and points the Route 53 apex records at the CloudFront distribution.

## Resume
The resume is written in LaTeX at `resume/resume.tex`. Build it with [Tectonic](https://tectonic-typesetting.github.io/) (`brew install tectonic`):

```sh
make resume
```

This writes `src/resume.pdf`, which the site serves for download at [dliu.com/resume.pdf](https://dliu.com/resume.pdf). Commit the rebuilt PDF and deploy.

## Deployment
Deploy the `MeSite` stack to the default AWS account and region (`eu-west-1`):

```sh
make install
make test
make deploy
```
