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

css: www/launcher/launcher.css

dependencies: www/launcher/onsenui.min.css \
	www/launcher/jquery.min.js

js: www/launcher/launcher.js

run: build
	cordova run

www/launcher/%.css: src/launcher/%.css
	cp src/launcher/$*.css www/launcher/$*.css

# Update Onsen UI
ONSENUI_ROOT = node_modules/onsenui
ONSENUI_CSS = $(ONSENUI_ROOT)/css/onsenui.min.css $(ONSENUI_ROOT)/css/onsen-css-components.min.css
ONSENUI_JS = $(ONSENUI_ROOT)/js/onsenui.min.js
www/launcher/onsenui.min.css: $(ONSENUI_ROOT)/package.json
	cp $(ONSENUI_CSS) www/launcher/
	cp $(ONSENUI_JS) www/launcher/

# Update jQuery
www/launcher/jquery.min.js: node_modules/jquery/package.json
	cp node_modules/jquery/dist/jquery.min.js www/launcher/

www/launcher/launcher.js: src/common/*.mjs src/launcher/*.mjs
	webpack