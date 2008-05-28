import os
import sys
import base64

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print "usage: %s <z5-file>" % sys.argv[0]
        sys.exit(-1)
    contents = open(sys.argv[1], "rb").read()
    print "processBase64Zcode('%s');" % (
        base64.b64encode(contents)
        )
