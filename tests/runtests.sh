#!/bin/sh

cd "$(dirname "$0")/.."

REGTEST=./node_modules/.bin/regtest

echo 'Glulx'
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/glulxercise.ulx.regtest
echo 'Hugo'
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/coretest.hex.regtest
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/colossal.hex.regtest
echo 'TADS 2'
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/ditch.gam.regtest
echo 'TADS 3'
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/ditch3.t3.regtest
echo 'Z-Code'
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/praxix.z5.regtest
$REGTEST -t 10 -i index.html src/upstream/emglken/tests/advent.z5.regtest