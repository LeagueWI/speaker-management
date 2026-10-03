#!/usr/bin/env bash
set -euo pipefail

rm -rf public
mkdir -p public
cp app.html public/index.html
cp app.js public/app.js
cp styles.css public/styles.css
cp bridge-test.html public/bridge-test.html

echo "Prepared Cloudflare Worker static assets in ./public"
