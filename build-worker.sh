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

# Program Flow is kept in its own script so the core dashboard remains easy to maintain.
# PizZip + Docxtemplater populate the uploaded Word template in the browser.
sed -i 's#<script src="/app.js"></script>#<script src="/app.js"></script><script src="https://unpkg.com/pizzip@3.2.0/dist/pizzip.js"></script><script src="https://unpkg.com/docxtemplater@3.71.0/build/docxtemplater.js"></script><script src="/program-flow.js"></script>#' public/index.html

echo "Prepared Cloudflare Worker static assets in ./public"
