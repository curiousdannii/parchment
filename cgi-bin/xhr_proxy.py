#! /usr/bin/env python

import re
import os
import cgi
import cgitb
import urllib2
import distutils.dir_util

cgitb.enable()

form = cgi.FieldStorage()
if form.has_key("file"):
    path = form["file"].value
else:
    path = ""

__main__ = __import__("__main__")

mydir = os.path.dirname(__main__.__file__)

ROOT_DIR = os.path.abspath(os.path.join(mydir, "..", "if-archive"))
ZCODE_REGEXP = r".*\.z([1-8]|blorb)$"

localpath = os.path.normpath(os.path.join(ROOT_DIR, path))

result = None

try:
    if not re.match(ZCODE_REGEXP, path):
        result = "ERROR: File does not appear to be a zcode file."
    if not localpath.startswith(ROOT_DIR):
        result = "ERROR: Security violation: can't retrieve file below root dir."
    elif os.path.exists(localpath):
        result = "SUCCESS: Path exists."
    else:
        fileobj = urllib2.urlopen("http://www.ifarchive.org/if-archive/%s" % path)
        contents = fileobj.read()
        distutils.dir_util.mkpath(os.path.dirname(localpath))
        open(localpath, "wb").write(contents)
        result = "SUCCESS: File retrieved."
except Exception, e:
    result = "ERROR: Unexpected exception: %s" % e

print "Content-Type: text/plain"
print
print result
