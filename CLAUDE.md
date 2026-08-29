# haydnmcintyre.ca

Haydn McIntyre's personal site and portfolio. Live at <https://haydnmcintyre.ca>.

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no npm.
Two pages: `index.html` (home) and `portfolio.html`.

## Deploying

Cloudflare Pages builds from `main` on every push. Build command is empty and the
output directory is the repo root.

```bash
git add . && git commit -m "what changed" && git push
```

Live about a minute later. Verify with a real request, never assume:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://haydnmcintyre.ca/
```

GitHub repo: `HaydnM17/haydnmcintyre.ca`. Commits use the GitHub noreply address.

## Previewing and screenshots

**Never use the `mcp__Claude_Browser__*` preview-pane tools.** They crash this
machine's session and have required a full Claude Code reinstall. Drive headless
Edge instead:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new \
  --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1280,3000 --screenshot=out.png --virtual-time-budget=12000 \
  "file:///D:/haydn/Website/index.html"
```

Crop tall captures into readable chunks with PowerShell + `System.Drawing`.
Notes that cost time to rediscover:

- Headless Edge will not lay out below about 500px. To check a phone width,
  render the page inside a 390px `<iframe>` on a wider harness page.
- Programmatic `scrollTo` does not take effect under `--virtual-time-budget`,
  so scroll-triggered behaviour cannot be tested that way.
- Put test harness files **inside this folder**, not the scratchpad, or relative
  `styles.css` and `script.js` resolve to stale copies.
- Animations mid-flight ruin screenshots. Inject overrides to settle them:
  `.reveal,.reveal.is-in{opacity:1!important;transform:none!important}`
  `.rise{animation:none!important;opacity:1!important;transform:none!important}`
  `.bolt-rule polyline{stroke-dashoffset:0!important}`

## Conventions

- Design tokens live at the top of `styles.css`. Change `--brass` and `--green`
  and the whole site follows.
- Contrast is computed, not guessed. `--faint` and `--line-int` exist because the
  originals measured below WCAG minimums.
- `--line-2` is decorative only. Anything interactive uses `--line-int` (3:1).
- The hero canvas effect lives in `script.js` as one self-contained IIFE that
  assigns `heroField` at the end. Swapping the effect means replacing that block.
- Every section heading gets a `.bolt-rule` underline that draws itself on scroll.

## Content rules Haydn has set

These came from direct feedback. Do not reintroduce them.

- Never say the site is "written by hand" or "built by hand". It is untrue.
- No em dashes anywhere. He reads them as an AI tell. Use commas and periods.
- No "Solo build" or role breakdown on solo projects. Movement Unlimited keeps
  "Project lead" because it was a team of five.
- No pricing, no free-work offers, no "I reply within a day".
- No scrolling marquee or ticker.
- Headings do not end in a period.
- Home page sells websites. Deeper technical detail belongs on the portfolio page.

## Known gaps

- **The contact form has no backend.** It opens the visitor's mail app. To make
  it submit, create a form at formspree.io and replace `YOUR_FORM_ID` in the
  `action` in `index.html`. The script detects the change automatically.
- **`assets/work/this-site.png` is ~1.6 MB.** Converting it to WebP would cut it
  by roughly 90% with no visible loss.
- GitHub Pages may still be enabled on the repo, serving a duplicate of the site.

## Email

`haydnmcintyre@yahoo.ca`, never his school address and never his gmail. It is
never written into the markup: `script.js` assembles it at runtime and fills any
element marked `data-mail`. To change it, edit `mailUser` / `mailHost` at the top
of `script.js`.
