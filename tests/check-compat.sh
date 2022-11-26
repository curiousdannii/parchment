#!/bin/sh

set -e

cd "$(dirname "$0")/.."

cp -r tests/browser-compat/. dist/

cd dist
npx eslint web
cd inform7
npx eslint .