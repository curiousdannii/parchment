# Makefile for the Parchment Cordova app

# Default to running multiple jobs
JOBS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
MAKEFLAGS = "-j $(JOBS)"

# Add node bin scripts to path
PATH := $(shell npm bin):$(PATH)

.PHONY: all build css dependencies run vms webpack

all: build

# Build with webpack
build: css dependencies glkote vms webpack

css: www/launcher/launcher.css

dependencies: www/launcher/onsenui.min.css \
	www/common/jquery.min.js

glkote: www/glkote/glkote.html

run: build
	cordova run

vms: www/ifvms/zvm.min.js

webpack: src/common/*.mjs src/glkote/*.mjs src/launcher/*.mjs
	webpack

www/common/jquery.min.js: node_modules/jquery/package.json
	mkdir -p www/common
	cp node_modules/jquery/dist/jquery.min.js www/common/

www/glkote/glkote.html: src/glkote/glkote.html src/upstream/glkote/*.js
	mkdir -p www/glkote
	cp src/glkote/glkote.html www/glkote/
	cp src/upstream/glkote/glkapi.js src/upstream/glkote/glkote.js www/glkote/

www/ifvms/zvm.min.js: src/upstream/ifvms/zvm.min.js
	mkdir -p www/ifvms
	cp src/upstream/ifvms/dispatch.js src/upstream/ifvms/zvm.min.js www/ifvms/

www/launcher/%.css: src/launcher/%.css
	mkdir -p www/launcher
	cp src/launcher/$*.css www/launcher/$*.css

# Update Onsen UI
ONSENUI_ROOT = node_modules/onsenui
ONSENUI_CSS = $(ONSENUI_ROOT)/css/onsenui.min.css $(ONSENUI_ROOT)/css/onsen-css-components.min.css
ONSENUI_JS = $(ONSENUI_ROOT)/js/onsenui.min.js
www/launcher/onsenui.min.css: $(ONSENUI_ROOT)/package.json
	mkdir -p www/launcher
	cp $(ONSENUI_CSS) www/launcher/
	cp $(ONSENUI_JS) www/launcher/