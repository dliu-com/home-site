# Development notes for [dliu.com](https://dliu.com)

## Hosting
The site is deployed as static files from `src/` to a private S3 bucket served through CloudFront. The CDK stack imports `MainDomain` and `MainHostedZoneId`, creates the ACM certificate in `us-east-1`, and points the Route 53 apex records at the CloudFront distribution.

## Shared UI
The pages use the shared dliu.com look ([spec](https://files.dliu.com/dliu.com/README.md), [demo](https://files.dliu.com/dliu.com/ui/v1/demo.html)):

- `https://files.dliu.com/dliu.com/ui/v1/dl.css` loads first, then `/style.css`. The site has no logo of its own, so the DL icon `https://files.dliu.com/dliu.com/favicon.png` is its favicon and header logo.
- Pages use the shared `dl-header` (logo and `Dewei Liu` in one `dl-brand` link; no menu, as the page's own links cover GitHub, LinkedIn and the résumé), `dl-main`, `dl-footer` (starting with the shared DL logo, `dl-footer-logo`), and `dl-card` classes. Light theme only, no shared JavaScript.
- `src/style.css` keeps only landing-page rules and uses the `--dl-*` variables, with no colours of its own. `cdk/test/shared-ui.test.ts` guards this.

## Docs
- [dliu.com/docs](https://dliu.com/docs) (`src/docs.html`) describes how the site works: architecture, caching, deployment, cost and security.
- Its **Testing** tab, [dliu.com/docs#health](https://dliu.com/docs#health), explains in plain words, with a diagram, how [status.dliu.com](https://status.dliu.com) tests the site as a guest; the technical details are folded.
- [dliu.com/docs/health.md](https://dliu.com/docs/health.md) (`src/docs/health.md`, served as `text/markdown; charset=utf-8`) is the full technical version for machines: functions, guest checks (URL, status, content type, body marker, slow threshold) and rules. dliu.com has no backend, so there is no `/health` endpoint.
- Keep the Testing tab and `health.md` in sync; `cdk/test/health.test.ts` fails if their functions or checks differ, or a body marker disappears.

The docs page uses the shared `dl-docs.css` layout and isn't linked from the header. A viewer-request CloudFront Function serves `/docs` from `docs.html` and `/` from `index.html`, and redirects the old `/docs/health` to `/docs#health` (301). Keep the pages up to date when the stack changes.

## Resume
The resume is written in LaTeX at `resume/resume.tex`. Build it with [Tectonic](https://tectonic-typesetting.github.io/) (`brew install tectonic`):

```sh
make resume
```

This writes `src/resume.pdf`, which the site serves for download at [dliu.com/resume.pdf](https://dliu.com/resume.pdf). Commit the rebuilt PDF and deploy.

## Caching
- **Edge (CloudFront):** HTTP/2 and HTTP/3 are enabled. Non-HTML files (`resume.pdf`, `style.css`, `docs/health.md`) are uploaded with `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=86400`, so browsers keep them for 5 minutes and CloudFront for up to 1 day. HTML files have no `Cache-Control` header and use CloudFront's default caching (up to 1 day at the edge).
- **Clearing:** every `make deploy` invalidates `/*` once, so changes show immediately.
- **Automatic clearing (S3 events → CloudFront invalidation): not used.** The bucket only changes through deploys, which already clear the whole cache. Nothing writes to it at runtime. Adding automatic clearing would only spend the 1,000 free invalidation paths a month that all dliu.com sites share. Don't edit the bucket by hand; if you do, run a CloudFront invalidation yourself.

## Deployment
Deploy the `dliu-com` stack to the default AWS account and region (`eu-west-1`):

```sh
make install
make test
make deploy
```
