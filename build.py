import os
import re

includes = (
	('src/lib/extras.js', (
		'src/plugins/class.js',
		'src/plugins/iff.js',
		'src/plugins/jquery.mousewheel.js',
		'src/plugins/jquery.hotkeys.js',
		'src/parchment/querystring.js',
		'src/parchment/remedial.js',
		'src/parchment/error-handling.js',
		'src/parchment/beret.js',
		'src/parchment/intro.js',
		'src/parchment/file.js',
	)),
	('src/lib/parchment.js', (
		'src/parchment/ui.js',
		'src/parchment/engine-runner.js',
		'src/parchment/console.js',
		'src/parchment/web-zui.js',
		'src/parchment/library.js',
		'src/parchment/outro.js',
	)),
)

compress = (
	('src/gnusto/gnusto-engine.js', 'lib/gnusto.min.js'),
	('src/lib/extras.js', 'lib/extras.min.js'),
	('src/lib/parchment.js', 'lib/parchment.min.js'),
)

comments = re.compile(';;;.+$', re.M)

# Combine source files together to make 'packages'
for package in includes:
	output = open(package[0], 'w')
	for include in package[1]:
		data = file(include).read()
		# Strip out lines beginning with ;;;
		data = comments.sub('', data)
		output.write(data)
	output.close()
		
# Compress these files, requires the YUI Compressor. Icky Java
for file in compress:
	command = 'java -jar tools/yuicompressor-2.4.2.jar %s -o %s' % (file[0], file[1])
	os.system(command)
