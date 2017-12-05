# Makefile for the Parchment Cordova app

# Default to running multiple jobs
JOBS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
MAKEFLAGS = "-j $(JOBS)"

# Add node bin scripts to path
PATH := $(shell npm bin):$(PATH)

.PHONY: all build css dependencies js run

all: build

# Build with webpack
build: css dependencies js

css: www/css/launcher.css

dependencies: www/css/onsenui.min.css \
	www/js/jquery.min.js

js: www/js/launcher.js

run: build
	cordova run

www/css/%.css: src/css/%.css
	cp src/css/$*.css www/css/$*.css

# Update Onsen UI
ONSENUI_ROOT = node_modules/onsenui
ONSENUI_CSS = $(ONSENUI_ROOT)/css/onsenui.min.css $(ONSENUI_ROOT)/css/onsen-css-components.min.css
ONSENUI_JS = $(ONSENUI_ROOT)/js/onsenui.min.js
www/css/onsenui.min.css: $(ONSENUI_ROOT)/package.json
	cp $(ONSENUI_CSS) www/css/
	cp $(ONSENUI_JS) www/js/

# Update jQuery
www/js/jquery.min.js: node_modules/jquery/package.json
	cp node_modules/jquery/dist/jquery.min.js www/js/

www/js/launcher.js: src/js/*.js
	webpack