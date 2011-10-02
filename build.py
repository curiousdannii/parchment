#!/usr/bin/env python

# Parchment build script
#
# Copyright (c) 2008-2011 The Parchment Contributors
# BSD licenced
# http://code.google.com/p/parchment

# Lists of files to combine together
includes = (
	('.build/parchment.js', (
		'src/parchment/intro.js',
		'src/lib/class.js',
		'src/lib/iff.js',
		'src/plugins/remedial.js',
		'src/parchment/error-handling.js',
		'src/parchment/file.js',
		'src/parchment/ui.js',
		'src/parchment/library.js',
		'src/parchment/quixe.js',
		'src/parchment/gnusto.js',
		'src/parchment/zvm.js',
		'src/parchment/outro.js',
	)),
	('.build/gnusto.js', (
		'src/gnusto/engine/gnusto-engine.js',
	)),
	('.build/zmachine.js', (
		'src/gnusto/runner/zui.js',
		'src/plugins/quetzal.js',
		'src/gnusto/runner/runner.js',
		'src/gnusto/runner/console.js',
	)),
	('.build/quixe.js', (
		'src/quixe/quixe/quixe.js',
		'src/quixe/quixe/gi_dispa.js',
	)),
	('.build/glkote.js', (
		'src/quixe/glkote/glkote.js',
		'src/quixe/glkote/dialog.js',
		'src/quixe/glkote/glkapi.js',
	)),
	('.build/zvm.js', (
		'src/ifvms.js/src/zvm/intro.js',
		'src/ifvms.js/src/common/bytearray.js',
		'src/ifvms.js/src/common/ast.js',
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

# List of files to compress (with debug code removed)
compress = (
	('.build/gnusto.js', 'lib/gnusto.min.js'),
	('.build/parchment.js', 'lib/parchment.min.js'),
	('.build/zmachine.js', 'lib/zmachine.min.js'),
	('.build/glkote.js', 'lib/glkote.min.js'),
	('.build/quixe.js', 'lib/quixe.min.js'),
	('.build/zvm.js', 'lib/zvm.min.js', 'src/ifvms.js/src/zvm/header.txt'),
)

import datetime
import os
import re
import time

# Today's date
today = str(datetime.date.today())

# regex for debug lines
debug = re.compile('(;;;.+$)|(/\* DEBUG \*/[\s\S]+?(/\* ELSEDEBUG|/\* ENDDEBUG \*/))', re.M)

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
	
	# Strip out debug lines beginning with ;;;
	data = file(package[0]).read()
	data = debug.sub('', data)
	
	# Write to a temp file
	output = open('.build/temp', 'w')
	output.write(data)
	output.close()
	
	# Compress!
	command = 'java -jar tools/yuicompressor-2.4.2.jar --type js .build/temp -o .build/temp'
	os.system(command)
	data = file('.build/temp').read()
	
	# Add a header if needed
	if len(package) == 3:
		data = file(package[2]).read() + data
		
	# Set the date
	data = data.replace('BUILDDATE', today)
	
	output = open(package[1], 'w')
	output.write(data)
	output.close()

print "Finished!"
time.sleep(3)