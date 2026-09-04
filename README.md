# haydnmcintyre.ca

Personal site and portfolio for Haydn McIntyre, version 1. Two pages: a home
page about the websites I build, and a portfolio page with the projects behind
it.

This is the archived version. The current site is <https://haydnmcintyre.ca>,
built from `HaydnM17/haydnmcintyre.ca-v2`. This one stays up at
<https://v1.haydnmcintyre.ca> because the current portfolio links to it, and it
is held out of search so it does not compete with the live site for the same
name. See the note at the bottom before touching `robots.txt`, `_headers` or
the `robots` meta tags.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Files

| | |
| --- | --- |
| `index.html` | Home: hero, portfolio preview, about, services, contact |
| `portfolio.html` | Projects in detail, plus technical skills |
| `styles.css` | All styling. Design tokens are at the top of the file |
| `script.js` | Hero canvas, nav, lightbox, scroll reveals, contact form |
| `functions/api/contact.js` | Contact form endpoint, deployed by Cloudflare Pages |
| `robots.txt` | Leaves crawling open on purpose, so the noindex can be read |
| `_headers` | Sends `X-Robots-Tag: noindex`, which covers the assets too |
| `assets/work/` | Project screenshots |
| `build-standalone.sh` | Optional: bundles the home page into one self-contained file |

## Running it

Open `index.html` in a browser. There is nothing to install and nothing to
compile.

## Deploying

Cloudflare Pages builds from `main` automatically:

```bash
git add .
git commit -m "what changed"
git push
```

Live about a minute later. Build command is empty and the output directory is
the repository root.

## Notes

**The contact form posts to `/api/contact`,** which is
`functions/api/contact.js` in this repository. Cloudflare Pages turns anything
under `functions/` into a live endpoint at deploy time, so there is still no
build step. It mails the message through Cloudflare's own sending API, which is
free when the recipient is a verified Email Routing destination on the same
account. It is switched on with four environment variables on the Pages project,
listed in the comment at the top of the file. Until they are set the endpoint
answers 501 and the form falls back to opening the visitor's mail app, so it is
never a dead end and nothing has to be configured for the site to ship.

**The email address is never in the markup.** `script.js` assembles it at
runtime and fills any element marked `data-mail`, so scrapers reading the raw
HTML find nothing. To change it, edit the `mailUser` and `mailHost` lines at the
top of `script.js`.

**Adding a project.** Copy an `<article class="project">` block in
`portfolio.html` and swap the contents. Add `project-alt` to the class list to
flip which side the image sits on, so they alternate down the page.

## Held out of search

The current site is <https://haydnmcintyre.ca>, built from
`HaydnM17/haydnmcintyre.ca-v2`. This repository is the first version of it, kept
live at <https://v1.haydnmcintyre.ca> because the current portfolio links to it
as a piece of work you can go and look at.

It is the same name and the same person as the live site, so it must never turn
up in search: anything it ranks for, it takes from there. Both pages carry
`<meta name="robots" content="noindex, follow">`, `_headers` sends the same
thing as `X-Robots-Tag` so it also covers the screenshots, and `robots.txt`
deliberately leaves crawling open, because a page that cannot be crawled is a
page whose noindex is never read. Do not "fix" that by disallowing everything,
and do not drop the meta tags when editing the heads.
