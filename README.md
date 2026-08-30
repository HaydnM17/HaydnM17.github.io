# haydnmcintyre.ca

Personal site and portfolio for Haydn McIntyre. Two pages: a home page about the
websites I build, and a portfolio page with the projects behind it.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Files

| | |
| --- | --- |
| `index.html` | Home: hero, portfolio preview, about, services, contact |
| `portfolio.html` | Projects in detail, plus technical skills |
| `styles.css` | All styling. Design tokens are at the top of the file |
| `script.js` | Hero canvas, nav, lightbox, scroll reveals, contact form |
| `functions/api/contact.js` | Contact form endpoint, deployed by Cloudflare Pages |
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
