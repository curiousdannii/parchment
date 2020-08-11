#!/bin/sh

npm run gulp inform7

sed "s/DATE/$(date '+%Y.%m')/" src/inform7/manifest.txt > 'dist/inform7/Parchment/(manifest).txt'
cp src/upstream/glkote/jquery.min.js dist/inform7/Parchment
cp src/upstream/quixe/media/resourcemap.js dist/inform7/Parchment
cp src/upstream/glkote/waiting.gif dist/inform7/Parchment

cd dist/inform7/ && zip -r parchment-for-inform7.zip Parchment