import glob
import os
import subprocess

TESTS = glob.glob(os.path.join("tests", "*.js"))

OUTPUT_FILE = "test_output.txt"

def run_tests():
    for test in TESTS:
        output = open(OUTPUT_FILE, "w")
        result = subprocess.call(
            ["java", "org.mozilla.javascript.tools.shell.Main", test],
            stdout = output,
            stderr = subprocess.STDOUT
            )
        output.close()

        expected_output_file = "tests/output/%s.txt" % (
            os.path.splitext(os.path.basename(test))[0]
            )

        if not os.path.exists(expected_output_file):
            success = (result == 0)
        else:
            lines = open(OUTPUT_FILE, "r").readlines()
            expected_lines = open(expected_output_file, "r").readlines()
            success = (lines == expected_lines)

        if not success:
            print 'Test "%s" failed.' % test
        else:
            print 'Test "%s" passed.' % test
    os.remove(OUTPUT_FILE)

if __name__ == "__main__":
    run_tests()
