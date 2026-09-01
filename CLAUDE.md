# haydnmcintyre.ca

Haydn McIntyre's personal site and portfolio. Live at <https://haydnmcintyre.ca>.

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no npm.
Two pages: `index.html` (home) and `portfolio.html`.

## Deploying

Cloudflare Pages builds from `main` on every push. Build command is empty and the
output directory is the repo root. Anything under `functions/` is compiled into
a Worker at deploy time and served at the matching path, so `/api/contact` comes
from `functions/api/contact.js`. Still no build step and still no npm.

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
- `requestAnimationFrame` callbacks never run under `--virtual-time-budget`,
  for the same reason `scrollTo` does not: no frames are produced. Timers and
  CSS transitions do advance, so drive animation with those if it has to be
  testable here. The preview reels were rewritten from rAF to CSS transitions
  for exactly this reason, and are better for it.
- Animations mid-flight ruin screenshots. Inject overrides to settle them:
  `.reveal,.reveal.is-in{opacity:1!important;transform:none!important}`
  `.rise{animation:none!important;opacity:1!important;transform:none!important}`
  `.bolt-rule polyline{stroke-dashoffset:0!important}`

## Project previews

The previews on the home page are animated in the browser, not videos. The
portfolio page instead lays every capture out in `[data-strip]` filmstrips,
paged by arrow buttons over a native scroll-snap view, with each cell feeding
the existing lightbox. Each `[data-reel]` frame holds `.reel-slide` units. A slide
is one page: an optional `.reel-head` pinned at the top the way a real sticky
header is, and a `.reel-page` that scrolls underneath it. `script.js` runs every
slide on the same fixed beat whatever its height, which is what keeps the
desktop frame and the phone beside it in step while they browse the same site.

A slide names its click target with `data-click="x,y"`, as percentages of its
pinned header if it has one, otherwise of the screen. That is why the cursor
lands on the actual link at any frame size. The site slides point at the nav
links (`Portfolio` at 66.9%, `Home` at 60.7% of a 1280px capture); the Movement
Unlimited slides point at its nav tabs. Phone frames carry no cursor element at
all, so they wait out the same interval instead.

Assets are captured with headless Edge, then sliced into a header strip and a
headerless body so the header can stay pinned. Capture with the topbar forced
into its scrolled state and the reels frozen (`sed 's| data-reel>|>|g'`), or the
preview will contain a half-played copy of itself:

```bash
msedge --headless=new --window-size=1280,7000 --screenshot=out.png --virtual-time-budget=15000 "file:///D:/haydn/Website/index.html"
```

Mobile captures go through a 390px `<iframe>` on a wider harness page, per the
note above. The header is 69px at every width. Regenerate `head-desk-*`,
`reel-desk-*`, `head-mob-*` and `reel-mob-*` whenever the pages change enough to
look stale.

Movement Unlimited and Workout Tracker only have single viewport captures, so
they cut between screens rather than scrolling, and there is no mobile view of
Movement Unlimited to pair with its desktop one. Full length captures or a short
screen recording would fix both.

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
- Never "we", "our" or "us". He works alone, so it is always "I". "We work out
  what your site has to do" was cut for this.
- Each of the three build services says the whole process: working out what it
  has to do, designing it, building it, and getting it live or shipped.
- No claims about what Haydn likes, enjoys or prefers. "I like taking a thing end
  to end" was cut for this. Write what he does and what a client gets, not his
  character.
- Do not write that something is "built around what a business actually does" or
  "picked off a shelf and recoloured" in the bio. Say fully customized and made
  for exactly what they need.
- No em dashes anywhere. He reads them as an AI tell. Use commas and periods.
- No "Solo build" or role breakdown on solo projects. Movement Unlimited keeps
  "Project lead" because it was a team of five.
- No pricing, no free-work offers, no "I reply within a day".
- No scrolling marquee or ticker.
- Headings do not end in a period.
- Home page sells all three things he builds: websites, web applications and
  mobile apps. Deeper technical detail belongs on the portfolio page.
- The bio says he graduated from Niagara College in 2026 and stops there. Do not
  reintroduce "three-year advanced diploma". The program name stays in the facts
  list beside it.
- Gold (`btn-primary`, `nav-cta`) means Contact wherever it is a navigation
  choice. Section CTAs like "See the full portfolio" and the form's own submit
  button keep it as the primary action of that section.

## Known gaps

- **The contact form's mail is optional and currently off.** The backend exists
  (`functions/api/contact.js`, served at `/api/contact`). Until `CONTACT_TO`,
  `CONTACT_FROM`, `CF_ACCOUNT_ID` and `CF_EMAIL_TOKEN` are set on the Pages
  project it answers 501 and the form falls back to opening the visitor's mail
  app. That fallback is the deliberate default for client sites, so a site can
  ship with nobody having configured anything. Check the state with
  `curl -s https://haydnmcintyre.ca/api/contact`.
- **`assets/work/this-site.png` is ~1.6 MB and no longer referenced.** The
  animated previews replaced it. Delete it, or convert it to WebP if it is
  wanted again.
- GitHub Pages may still be enabled on the repo, serving a duplicate of the site.

## Email

`haydnmcintyre@yahoo.ca`, never his school address and never his gmail. It is
never written into the markup: `script.js` assembles it at runtime and fills any
element marked `data-mail`. To change it, edit `mailUser` / `mailHost` at the top
of `script.js`.
