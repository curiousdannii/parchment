#!/bin/sh

cd "$(dirname "$0")/.."

npm run gulp inform7

sed "s/DATE/$(date '+%Y.%-m')/" src/inform7/manifest.txt > 'dist/inform7/Parchment/(manifest).txt'
cp node_modules/jquery/dist/jquery.min.js dist/inform7/Parchment
cp src/upstream/quixe/media/resourcemap.js dist/inform7/Parchment
cp src/upstream/glkote/waiting.gif dist/inform7/Parchment

cd dist/inform7

# Download the zip so we can check file hashes
if [ ! -f parchment-for-inform7.zip ]; then
    echo "Downloading old parchment-for-inform7.zip"
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$BRANCH" = "testing" ]; then
        curl -s -L https://github.com/curiousdannii/parchment-testing/raw/gh-pages/dist/inform7/parchment-for-inform7.zip -o parchment-for-inform7.zip
    else
        curl -s -L https://github.com/curiousdannii/parchment/raw/gh-pages/dist/inform7/parchment-for-inform7.zip -o parchment-for-inform7.zip
    fi
fi

# Unzip the old zip
unzip -joq parchment-for-inform7.zip -d Parchment-old

diff Parchment Parchment-old >/dev/null
if [ $? -ne 0 ]; then
    echo "Files changed; updating parchment-for-inform7.zip"
    zip -r parchment-for-inform7.zip Parchment
else
    echo "Files are unchanged"
fi
