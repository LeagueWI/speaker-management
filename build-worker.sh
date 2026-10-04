#!/usr/bin/env bash
set -euo pipefail

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

# Keep initial dashboard load light. Email Center and Program Flow load only when their
# navigation sections are opened; their heavier API calls and Word libraries are deferred.
sed -i 's#<script src="/app.js"></script>#<script src="/app.js"></script><script src="/lazy-tools.js"></script>#' public/index.html

echo "Prepared Cloudflare Worker static assets in ./public"
