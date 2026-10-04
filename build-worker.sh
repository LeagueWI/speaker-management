#!/usr/bin/env bash
set -euo pipefail

for js in app.js lazy-tools.js archive-tools.js email-center.js program-flow.js; do
  node --check "$js"
done

rm -rf public
mkdir -p public
cp app.html public/index.html
cp app.js public/app.js
cp styles.css public/styles.css
cp bridge-test.html public/bridge-test.html
cp program-flow.js public/program-flow.js
cp program-flow-starter.docx public/program-flow-starter.docx
cp email-center.js public/email-center.js
cp lazy-tools.js public/lazy-tools.js
cp archive-tools.js public/archive-tools.js

# Archive tools observe shared state and keep archived events out of current work queues.
# Load them before app.js so state refreshes are observed without changing API responses.
# Email Center and Program Flow still load lazily when their navigation sections are opened.
sed -i 's#<script src="/app.js"></script>#<script src="/archive-tools.js"></script><script src="/app.js"></script><script src="/lazy-tools.js"></script>#' public/index.html

echo "Prepared Cloudflare Worker static assets in ./public"
