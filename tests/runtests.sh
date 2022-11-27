#!/bin/bash

cd "$(dirname "$0")/.."

FAILURES=0

# run_test emglken_testfile [timeout]
run_test() {
    ./node_modules/.bin/regtest -t ${2:-10} -i index.html src/upstream/emglken/tests/$1 || ((FAILURES++))
}

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

exit $FAILURES