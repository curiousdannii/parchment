import elementtree.ElementTree as ET
import urllib2
import re
import os

import json

ZCODE_REGEXP = r".*\.z([1-8]|blorb)$"
EXCLUDED_DIRS = ["if-archive/infocom",
                 "if-archive/solutions",
                 "if-archive/starters"]
EXCLUDED_DIRS_REGEXP = "|".join(EXCLUDED_DIRS)
INDEX_URL = "http://www.ifarchive.org/indexes/Master-Index.xml"
XML_FILENAME = "Master-Index.xml"
JSON_FILENAME = "if-archive.json"

if __name__ == "__main__":
    if not os.path.exists(XML_FILENAME):
        print "Fetching %s." % INDEX_URL

        data = urllib2.urlopen(INDEX_URL).read()
        open(XML_FILENAME, "w").write(data)

    print "Scanning files."

    page = ET.ElementTree(file=XML_FILENAME)
    files = page.findall("file")
    zfiles = [
        filenode for filenode in files
        if re.match(ZCODE_REGEXP, filenode.find("name").text) and
        filenode.find("description") is not None and
        not re.match(EXCLUDED_DIRS_REGEXP, filenode.find("path").text)
        ]

    dicts = []

    print "Writing %s" % JSON_FILENAME

    for filenode in zfiles:
        desc = filenode.find("description").text.strip()
        if desc[-1] == ")":
            desc = desc[:desc.rindex("(")]
        elif desc[-1] == "]":
            desc = desc[:desc.rindex("[")]
        dicts.append(
            {"path" : filenode.find("path").text,
             "desc" : desc.encode("utf-8")}
            )

    open(JSON_FILENAME, "w").write(json.write(dicts))
