import os

includes = (
	('src/lib/plugins.js', (
		'src/plugins/jquery.mousewheel.js',
		'src/plugins/jquery.hotkeys.js',
	)),
	('src/lib/pre.js', (
		'src/parchment/querystring.js',
		'src/parchment/remedial.js',
		'src/parchment/base64.js',
		'src/parchment/error-handling.js',
		'src/parchment/beret.js',
		'src/parchment/file.js',
	)),
	('src/lib/post.js', (
		'src/parchment/engine-runner.js',
		'src/parchment/console.js',
		'src/parchment/web-zui.js',
	)),
)

compress = (
	('src/gnusto/gnusto-engine.js', 'lib/gnusto-engine.min.js'),
	('src/lib/plugins.js', 'lib/plugins.min.js'),
	('src/lib/post.js', 'lib/post.min.js'),
	('src/lib/pre.js', 'lib/pre.min.js'),
)

# Combine source files together to make 'packages'
for package in includes:
	output = open(package[0], 'w')
	for include in package[1]:
		output.write(file(include).read())
	output.close()
		
# Compress these files, requires the YUI Compressor. Icky Java
for file in compress:
	command = 'java -jar yuicompressor-2.4.2.jar %s -o %s' % (file[0], file[1])
	os.system(command)
