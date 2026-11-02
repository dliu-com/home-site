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

## Caching
- **Edge (CloudFront):** HTTP/2 and HTTP/3 are enabled. Non-HTML files (`resume.pdf`) are uploaded with `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=86400`, so browsers keep them for 5 minutes and CloudFront for up to 1 day. HTML files have no `Cache-Control` header and use CloudFront's default caching (up to 1 day at the edge).
- **Clearing:** every `make deploy` invalidates `/*` once, so changes show immediately.
- **Automatic clearing (S3 events → CloudFront invalidation): not used.** The bucket only changes through deploys, which already clear the whole cache. Nothing writes to it at runtime. Adding automatic clearing would only spend the 1,000 free invalidation paths a month that all dliu.com sites share. Don't edit the bucket by hand; if you do, run a CloudFront invalidation yourself.

## Deployment
Deploy the `MeSite` stack to the default AWS account and region (`eu-west-1`):

```sh
make install
make test
make deploy
```
