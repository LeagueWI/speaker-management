#!/usr/bin/env bash
set -euo pipefail

rm -rf public
mkdir -p public

# Static front-end files currently used by the application.
cp index.html public/index.html
cp bridge-test.html public/bridge-test.html

# Only /api/* should invoke Pages Functions. Everything else remains static.
cat > public/_routes.json <<'EOF'
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
EOF

echo "Cloudflare Pages output prepared in ./public"
