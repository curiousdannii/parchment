#!/bin/sh

cd "$(dirname "$0")/.."

./build.js inform7 tools
./tools/inform7-wasm.js

sed "s/DATE/$(date '+%Y.%-m')/" src/inform7/manifest.txt > 'dist/inform7/Parchment/(manifest).txt'

cd dist/inform7

echo "Packaging parchment-for-inform7.zip"
rm -f parchment-for-inform7.zip
zip -r parchment-for-inform7.zip Parchment