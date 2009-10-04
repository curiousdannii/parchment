#!/usr/bin/env python

# Parchment build script
#
# Copyright (c) 2003-2009 The Parchment Contributors
# Licenced under the GPL v2
# http://code.google.com/p/parchment

# Lists of files to combine together, note the combined files will have the debug lines removed
includes = (
	('src/lib/parchment.js', (
		'src/plugins/class.js',
		'src/plugins/iff.js',
		'src/plugins/jquery.mousewheel.js',
		'src/plugins/jquery.hotkeys.js',
		'src/plugins/querystring.js',
		'src/plugins/remedial.js',
		'src/parchment/error-handling.js',
		'src/plugins/quetzal.js',
		'src/parchment/intro.js',
		'src/parchment/file.js',
		'src/parchment/ui.js',
		'src/parchment/engine-runner.js',
		'src/parchment/console.js',
		'src/parchment/web-zui.js',
		'src/parchment/library.js',
		'src/parchment/outro.js',
	)),
)

# List of files to compress
compress = (
	('src/gnusto/gnusto-engine.js', 'lib/gnusto.min.js'),
	('src/lib/parchment.js', 'lib/parchment.min.js'),
)

import os
import re

# regex for debug lines
debug = re.compile(';;;.+$', re.M)

# Combine source files together to make 'packages'
for package in includes:
	output = open(package[0], 'w')
	for include in package[1]:
		data = file(include).read()
		# Strip out debug lines beginning with ;;;
		data = debug.sub('', data)
		output.write(data)
	output.close()
		
# Compress these files, requires the YUI Compressor. Icky Java
for file in compress:
	command = 'java -jar tools/yuicompressor-2.4.2.jar %s -o %s' % (file[0], file[1])
	os.system(command)
