# Haydn McIntyre — personal site

A single-page personal site. Dark, animated, and short on words on purpose:
hero, work, toolkit, about, contact.

Contact address is `haydnmcintyre@yahoo.ca`. It is never written into the
markup — `script.js` assembles it at runtime and fills in any element marked
`data-mail`, so scrapers reading the raw HTML come up empty. If you change the
address, change it in the `mailUser` / `mailHost` lines at the top of
`script.js` and nowhere else.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole site. |
| `styles.css` | All styling. Design tokens sit at the top. |
| `script.js` | Sticky nav, mobile menu, scroll reveals, form handling. |
| `assets/work/` | Project screenshots. |
| `build-standalone.sh` | Bundles everything into one file in `dist/`. |
| `dist/` | Generated. Safe to delete and rebuild. |

## Before it goes live

### Wire up the contact form

The form currently has no backend, so it falls back to opening the visitor's
email app with the message pre-filled. That works, but a real form converts
better.

1. Create a free form at [formspree.io](https://formspree.io).
2. Copy the endpoint it gives you (`https://formspree.io/f/abcdwxyz`).
3. Replace `YOUR_FORM_ID` in the form's `action` in `index.html`.

The script detects the swap and starts posting to the real endpoint.

### Add work as it lands

Each project is one `<article class="project">` block in the Work section:
screenshot, meta line, title, one short paragraph, and tags. Copy an existing
block and swap the contents. Add `project-alt` to the class list to flip which
side the image sits on — they should alternate down the page.

Keep descriptions to two or three sentences. The section works because it is
short.

### Movement Unlimited screenshot

The Azure demo this project was deployed to is gone (the DNS no longer
resolves), so the screenshot in `assets/work/` was captured by running the app
locally. If you redeploy it, link the live URL from the project title.

## Publishing it

Plain HTML, CSS, and JS with no build step, so any free static host works.
Upload the folder (minus `dist/`) and point your domain at it.

- **Cloudflare Pages** or **Netlify** — drag the folder onto their dashboard.
- **GitHub Pages** — push to a repo, enable Pages in settings.

All three give free HTTPS.

## The single-file version

```bash
bash build-standalone.sh
```

Writes `dist/haydn-site.html` with the CSS, JavaScript, and images inlined —
one file you can email to someone or open from a USB stick.

## Design notes

Dark by design: a green-black ground, a brass accent, and Archivo set wide
(`wdth 122`) for the display type. There is no light theme — the page commits to
one look and paints every colour explicitly.

Change `--brass` and `--green` at the top of `styles.css` and the whole site
follows.

Animation is deliberate and limited: a staggered load-in on the hero, one
scrolling marquee, scroll reveals, and hover states on cards and links. All of
it is disabled automatically for visitors who have reduced motion turned on.
