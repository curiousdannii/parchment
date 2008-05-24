import os
import glob

filenames = glob.glob("*.js")

for filename in filenames:
    basename, ext = os.path.splitext(filename)
    if not basename.endswith(".min"):
        print "Creating minified version of %s" % filename
        os.system("python jsmin.py < %(SOURCE)s > %(TARGET)s" % (
                {"SOURCE" : filename,
                 "TARGET" : "%s.min%s" % (basename, ext)}
                ))

filenames = glob.glob("*.html")

for filename in filenames:
    basename, ext = os.path.splitext(filename)
    if not basename.endswith(".min"):
        print "Creating minified version of %s" % filename
        newhtml = open(filename, "r").read().replace(".js", ".min.js")
        open("%s.min%s" % (basename, ext), "w").write(newhtml)
