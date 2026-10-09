#!/bin/sh
# Copies the invite into public/ and deploys invite + API to happybirthdayrishi.com
set -e
cd "$(dirname "$0")"
rm -rf public && mkdir public
cp ../index.html ../style.css ../config.js ../art.js ../game.js ../app.js ../og.jpg public/
cp -R ../assets public/
npx -y netlify-cli@latest deploy --prod --dir public
