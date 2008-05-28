"""
    zcode2js.py

    This utility converts a z-code story file into a Javascript file
    for use by Parchment.

    Usage is as follows:

      python zcode2js.py <z-code-file>

    The result is printed to stdout, so you'll probably want to pipe
    the output to a file, e.g.:

      python zcode2js.py mystory.z5 > mystory.z5.js
"""

import os
import sys
import base64

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print __import__("__main__").__doc__
        sys.exit(-1)
    contents = open(sys.argv[1], "rb").read()
    print "processBase64Zcode('%s');" % (
        base64.b64encode(contents)
        )
