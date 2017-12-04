# Makefile for the Parchment Cordova app

.PHONY: all dependencies

all: dependencies

dependencies: www/css/onsenui.min.css

# Update Onsen UI
ONSENUI_ROOT = node_modules/onsenui
ONSENUI_CSS = $(ONSENUI_ROOT)/css/onsenui.min.css $(ONSENUI_ROOT)/css/onsen-css-components.min.css
ONSENUI_JS = $(ONSENUI_ROOT)/js/onsenui.min.js
www/css/onsenui.min.css: $(ONSENUI_ROOT)/package.json
	cp $(ONSENUI_CSS) www/css/
	cp $(ONSENUI_JS) www/js/