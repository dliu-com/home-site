# dliu.com: health and guest checks

Full technical version of https://dliu.com/docs#health (the Health tab), for machines and AI agents. It follows the dliu.com health
contract used by https://status.dliu.com and is enough on its own to implement the tests.

dliu.com is a static site: HTML, CSS and a PDF in a private S3 bucket behind CloudFront. There is no backend (no Lambda,
database or API), so every function is tested with plain guest requests and there is no `/health` endpoint.

## Functions

| Key | Name | What it does | Critical |
| --- | --- | --- | --- |
| `pages` | Pages | Serves the landing page, the docs pages and their stylesheet. | yes |
| `resume` | Résumé | Serves the résumé PDF. | no |
| `routing` | Clean URLs and 404 | Serves `/docs` without `.html`, redirects the old `/docs/health` to `/docs#health`, and serves the 404 page for missing paths. | no |
| `https` | HTTPS | Redirects plain HTTP to HTTPS. | no |

The site is "down" when a critical function fails.

## Guest checks

Send each request with no cookies, no `Authorization` header and no query string, and do not follow redirects. A check
passes when the status code matches, the `Content-Type` starts with the expected type (`-` means not checked), and the
body contains the marker (or, for a redirect, the `Location` header starts with it). A check that passes but takes
longer than the slow threshold counts as slow.

| Function | Method | URL | Status | Content type | Body marker or `Location` prefix | Slow after (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `pages` | GET | `https://dliu.com/` | 200 | `text/html` | `class="dl-header"` | 2000 |
| `pages` | GET | `https://dliu.com/docs` | 200 | `text/html` | `dl-docs-main` | 2000 |
| `pages` | GET | `https://dliu.com/style.css` | 200 | `text/css` | `.app-grid` | 2000 |
| `pages` | GET | `https://dliu.com/docs/health.md` | 200 | `text/markdown` | `## Guest checks` | 2000 |
| `resume` | GET | `https://dliu.com/resume.pdf` | 200 | `application/pdf` | `%PDF-` | 3000 |
| `routing` | HEAD | `https://dliu.com/docs/health` | 301 | - | `/docs#health` | 2000 |
| `routing` | GET | `https://dliu.com/status-check-missing-page` | 404 | `text/html` | `Page not found` | 2000 |
| `https` | HEAD | `http://dliu.com/` | 301 | - | `https://dliu.com/` | 2000 |

## Health endpoint

None. dliu.com has no backend, so it has no health endpoint and the guest checks above cover the whole site. Don't
configure one: its health path just returns the HTML 404 page.

## Caching

HTML has no `Cache-Control` header (CloudFront caches it for up to 1 day). `style.css`, `resume.pdf` and this file are
sent with `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=86400`. Every deploy invalidates
`/*`, so a check right after a deploy sees the new files.

## Not tested

- Nothing on the site needs sign-in, so there are no signed-in actions to leave out.
- Deploys and cache invalidation, which run from the owner's machine.
- The `dl_vid` visitor cookie and the CloudFront access logs used by traffic.dliu.com.

## Rules

- Only `GET` and `HEAD`, as an anonymous guest. The tests are read only and must never change content.
- Use the user agent `dliu-status-bot/1.0 (+https://status.dliu.com/docs)`, so traffic.dliu.com leaves the requests out.
- Keep this file and https://dliu.com/docs#health in sync; the repo's `cdk/test/health.test.ts` checks that they list
  the same functions and checks.
