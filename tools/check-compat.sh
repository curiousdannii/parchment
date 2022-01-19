#!/bin/sh

cd "$(dirname "$0")/.."

cp -r tools/browser-compat/. dist/

cd dist
npx eslint web
cd inform7
npx eslint .