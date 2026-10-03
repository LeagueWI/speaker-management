#!/usr/bin/env bash
set -euo pipefail

rm -rf public
mkdir -p public
cp index.html public/index.html
cp bridge-test.html public/bridge-test.html

echo "Prepared Cloudflare Worker static assets in ./public"
