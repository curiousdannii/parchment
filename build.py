import os

compress = (
	('gnusto-engine.js', 'lib/gnusto-engine.min.js'),
)

for file in compress:
	command = 'java -jar yuicompressor-2.4.2.jar %s -o %s' % (file[0], file[1])
	os.system(command)
