#!/usr/bin/env python

# Parchment build script
#
# Copyright (c) 2008-2011 The Parchment Contributors
# BSD licenced
# http://code.google.com/p/parchment

# Lists of files to combine together
includes = (
	('.build/parchment.js', (
		'src/lib/class.js',
		'src/lib/iff.js',
		'src/structio/intro.js',
		'src/structio/input.js',
		'src/structio/textgrid.js',
		'src/structio/api.js',
		'src/structio/outro.js',
		'src/structio/runner.js',
		'src/parchment/intro.js',
		'src/parchment/error-handling.js',
		'src/parchment/file.js',
		'src/parchment/ui.js',
		'src/parchment/library.js',
		'src/parchment/quixe.js',
		'src/parchment/ifvms.js',
		'src/parchment/gnusto.js',
		'src/parchment/outro.js',
	)),
	('.build/parchment.css', (
		'src/parchment/parchment.css',
		'src/structio/structio.css',
	)),
	('.build/gnusto.js', (
		'src/ifvms.js/src/zvm/quetzal.js',
		'src/gnusto/remedial.js',
		'src/gnusto/engine/gnusto-engine.js',
		'src/ifvms.js/src/zvm/ui.js',
		'src/gnusto/runner.js',
	)),
	('.build/quixe.js', (
		'src/quixe/quixe/quixe.js',
		'src/quixe/quixe/gi_dispa.js',
	)),
	('.build/glkote.js', (
		'src/quixe/glkote/glkote.js',
		'src/quixe/glkote/dialog.js',
		'src/quixe/glkote/glkapi.js',
		'src/quixe/runner.js',
	)),
	('.build/glkote.css', (
		'src/quixe/media/i7-glkote.css',
		'src/quixe/media/dialog.css',
	)),
	('.build/zvm.js', (
		'src/ifvms.js/src/zvm/intro.js',
		'src/ifvms.js/src/common/util.js',
		'src/ifvms.js/src/common/bytearray.js',
		'src/ifvms.js/src/common/ast.js',
		'src/ifvms.js/src/zvm/quetzal.js',
		'src/ifvms.js/src/zvm/text.js',
		'src/ifvms.js/src/zvm/ui.js',
		'src/ifvms.js/src/zvm/opcodes.js',
		'src/ifvms.js/src/common/idioms.js',
		'src/ifvms.js/src/zvm/disassembler.js',
		'src/ifvms.js/src/zvm/runtime.js',
		'src/ifvms.js/src/zvm/vm.js',
		'src/ifvms.js/src/zvm/outro.js',
	)),
)

# regex for debug lines
import re
debug = re.compile('(;;;.+$)|(/\*\s*DEBUG\s*\*/[\s\S]+?(/\*\s*ELSEDEBUG|/\*\s*ENDDEBUG\s*\*/))', re.M)
debuggvm = re.compile('(/\*\s*ZVM\s*\*/[\s\S]+?/\*\s*ENDZVM\s*\*/)|(/\* GVM \*/\s*if\s*\(\s*GVM\s*\)\s*\{)|(\}\s*/\*\s*ENDGVM\s*\*/)', re.M)
debugzvm = re.compile('(/\*\s*GVM\s*\*/[\s\S]+?/\*\s*ENDGVM\s*\*/)|(/\* ZVM \*/\s*if\s*\(\s*ZVM\s*\)\s*\{)|(\}\s*/\*\s*ENDZVM\s*\*/)', re.M)

# List of files to compress (with debug code removed)
compress = (
	('.build/parchment.js', 'lib/parchment.min.js', 'src/parchment/header.txt'),
	('.build/parchment.css', 'lib/parchment.min.css', 'src/parchment/header.txt'),
	('.build/gnusto.js', 'lib/gnusto.min.js', 'src/gnusto/header.txt'),
	('.build/quixe.js', 'lib/quixe.min.js', 'src/quixe/quixe/header.txt'),
	('.build/glkote.js', 'lib/glkote.min.js', 'src/quixe/glkote/header.txt'),
	('.build/glkote.css', 'lib/glkote.min.css', 'src/quixe/glkote/header.txt'),
	('.build/zvm.js', 'lib/zvm.min.js', 'src/ifvms.js/src/zvm/header.txt', debugzvm),
)

import datetime
import os
import time

# Today's date
today = str(datetime.date.today())

# Create .build directory if needed
if not os.path.isdir('.build'):
	os.makedirs('.build')

filestobuild = []

# Combine source files together to make 'packages'
for package in includes:
	print 'Building package: ' + package[0]
	data = ''
	for include in package[1]:
		data += file(include).read()
	
	# Compare before writing out
	try:
		orig = file(package[0]).read()
	except:
		orig = ''
	if not orig == data:
		output = open(package[0], 'w')
		output.write(data)
		output.close()
		filestobuild.append(package[0])

# Compress these files, requires the YUI Compressor. Icky Java
for package in compress:
	if not package[0] in filestobuild:
		continue
	
	print 'Compressing file: ' + package[1]
	
	# Strip out debug code
	data = file(package[0]).read()
	data = debug.sub('', data)
	if len(package) > 3:
		data = package[3].sub('', data)
	
	# Write to a temp file
	output = open('.build/temp', 'w')
	output.write(data)
	output.close()
	
	# Compress!
	command = 'java -jar tools/yuicompressor-2.4.2.jar --type ' + (package[1].endswith('.js') and 'js' or 'css' ) + ' .build/temp -o .build/temp'
	os.system(command)
	data = file('.build/temp').read()
	
	# Add a header if needed
	if len(package) > 2:
		data = file(package[2]).read() + data
		
	# Set the date
	data = data.replace('BUILDDATE', today)
	
	output = open(package[1], 'w')
	output.write(data)
	output.close()

print "Finished!"
time.sleep(3)