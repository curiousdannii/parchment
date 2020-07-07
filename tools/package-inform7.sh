#!/bin/sh

npx webpack

mkdir -p dist/Parchment
cp src/\(manifest\).txt dist/Parchment
cp dist/dialog.css dist/Parchment
cp dist/glkote.css dist/Parchment
cp dist/jquery.min.js dist/Parchment
cp dist/main.js dist/Parchment
cp src/upstream/quixe/media/resourcemap.js dist/Parchment
cp dist/waiting.gif dist/Parchment

cd dist && zip -r parchment-for-inform7.zip Parchment