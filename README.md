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

**The contact form has no backend.** It currently opens the visitor's email app
with the message filled in. To make it submit properly, create a form at
[formspree.io](https://formspree.io) and replace `YOUR_FORM_ID` in the form's
`action` in `index.html`. The script detects the change and posts to it instead.

**The email address is never in the markup.** `script.js` assembles it at
runtime and fills any element marked `data-mail`, so scrapers reading the raw
HTML find nothing. To change it, edit the `mailUser` and `mailHost` lines at the
top of `script.js`.

**Adding a project.** Copy an `<article class="project">` block in
`portfolio.html` and swap the contents. Add `project-alt` to the class list to
flip which side the image sits on, so they alternate down the page.
