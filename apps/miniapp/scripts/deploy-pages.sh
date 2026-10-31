#!/bin/zsh
# Publish the Design Lab to GitHub Pages (branch gh-pages) under /<repo>/.
#   npm run deploy:pages            (requires public/demo-media → npm run demo:media)
set -e
cd "$(dirname "$0")/.."
REPO_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename -s .git "$REPO_URL")
BASE_PATH="/$REPO_NAME/" npx vite build --outDir dist-pages --emptyOutDir
cp dist-pages/index.html dist-pages/404.html   # SPA fallback for deep links (/design-lab, /app/a/...)
touch dist-pages/.nojekyll
cd dist-pages
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy Design Lab $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "$REPO_URL" gh-pages
rm -rf .git
echo "Deployed → https://$(echo "$REPO_URL" | sed -E 's#.*github.com[/:]([^/]+)/.*#\1#').github.io/$REPO_NAME/design-lab"
