import glob
import os
import subprocess

TESTS = glob.glob(os.path.join("tests", "*.js"))

OUTPUT_FILE = "test_output.txt"

def run_tests():
    for test in TESTS:
        output = open(OUTPUT_FILE, "w")
        subprocess.call(
            ["java", "org.mozilla.javascript.tools.shell.Main", test],
            stdout = output,
            stderr = subprocess.STDOUT
            )
        output.close()

        expected_output_file = "tests/output/%s.txt" % (
            os.path.splitext(os.path.basename(test))[0]
            )

        lines = open(OUTPUT_FILE, "r").readlines()
        expected_lines = open(expected_output_file, "r").readlines()

        if lines != expected_lines:
            print 'Test "%s" failed.' % test
        else:
            print 'Test "%s" passed.' % test
    os.remove(OUTPUT_FILE)

if __name__ == "__main__":
    run_tests()
