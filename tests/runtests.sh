#!/bin/bash

cd "$(dirname "$0")/.."

REGTEST=./node_modules/.bin/regtest

FAILURES=0

# run_test emglken_testfile [timeout]
run_test() {
    $REGTEST -t ${2:-10} -i $TESTFILE src/upstream/emglken/tests/$1 || ((FAILURES++))
}

run_tests() {
    echo 'Adrift 4'
    run_test Hamper.taf.regtest
    echo 'Glulx'
    run_test glulxercise.ulx.regtest
    echo 'Hugo'
    run_test coretest.hex.regtest
    run_test colossal.hex.regtest
    echo 'TADS 2'
    run_test ditch.gam.regtest
    echo 'TADS 3'
    run_test ditch3.t3.regtest
    echo 'Z-Code'
    run_test praxix.z5.regtest
    run_test advent.z5.regtest
}

echo 'Test Parchment'
TESTFILE=index.html
run_tests

echo 'Test single-file Parchment'
TESTFILE=dist/single-file/parchment.html
run_tests

# Try to build an Inform 7 site
if [ ! -f tests/ifsitegen.py ]; then
    wget -q https://github.com/erkyrath/glk-dev/raw/master/ifsitegen.py -O tests/ifsitegen.py
fi

echo -e '\nTesting an Inform playable website'
python ./tests/ifsitegen.py \
    -a tests/inform7-6M62 \
    -i dist/inform7/parchment-for-inform7.zip \
    -r tests/Release \
    src/upstream/emglken/tests/advent.z5

TESTFILE="file://$(pwd)/tests/Release/index.html"
run_test advent.z5.regtest

exit $FAILURES