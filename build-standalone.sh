#!/usr/bin/env bash
# Builds dist/haydn-site.html — the whole site as ONE file with the CSS, JS and
# images inlined. Useful for previewing, emailing, or publishing as an artifact.
# Run from the project root:  bash build-standalone.sh
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p dist
OUT="dist/haydn-site.html"

# 1. Start from index.html
cp index.html "$OUT"

# 2. Inline each screenshot as a data URI
for img in assets/work/*.png; do
  name=$(basename "$img")
  b64=$(base64 -w0 "$img")
  printf '%s\n' "$b64" > "dist/.b64"
  python_free_replace="$img"
  # awk does the substitution so huge base64 strings never hit sed's line limits
  awk -v target="src=\"$img\"" -v b64file="dist/.b64" '
    BEGIN { getline data < b64file }
    {
      idx = index($0, target)
      if (idx > 0) {
        rep = "src=\"data:image/png;base64," data "\""
        $0 = substr($0, 1, idx - 1) rep substr($0, idx + length(target))
      }
      print
    }
  ' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
done
rm -f dist/.b64

# 3. Inline the stylesheet
awk '
  /<link rel="stylesheet" href="styles.css">/ {
    print "<style>"
    while ((getline line < "styles.css") > 0) print line
    close("styles.css")
    print "</style>"
    next
  }
  { print }
' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"

# 3b. Inline the favicon, drop the file-based icon links (nothing to serve them)
FAV_B64=$(base64 -w0 favicon.svg)
awk -v fav="$FAV_B64" '
  /<link rel="icon" href="favicon.svg"/ {
    print "<link rel=\"icon\" type=\"image/svg+xml\" href=\"data:image/svg+xml;base64," fav "\">"
    next
  }
  /favicon-32.png|apple-touch-icon.png|site.webmanifest/ { next }
  { print }
' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"

# 4. Inline the script
awk '
  /<script src="script.js"><\/script>/ {
    print "<script>"
    while ((getline line < "script.js") > 0) print line
    close("script.js")
    print "</script>"
    next
  }
  { print }
' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"

echo "Built $OUT ($(wc -c < "$OUT") bytes)"
