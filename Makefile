EXTENSION_DOMAIN 	:= aaimio.github.com
EXTENSION_SLUG 	 	:= application-hotkeys
EXTENSION_NAME  	:= $(EXTENSION_SLUG)@$(EXTENSION_DOMAIN)

JS_FILES				 	:= dist/extension.js
SCHEMA_FILE 			:= dist/schemas/gschemas.compiled
ZIP_FILE 				 	:= $(EXTENSION_NAME).shell-extension.zip
PO_FILES					:= $(wildcard src/po/*.po)
LANGUAGES 			 	:= $(patsubst src/po/%.po,%,$(PO_FILES))
MO_FILES 				 	:= $(patsubst %,dist/locales/%/LC_MESSAGES/$(EXTENSION_NAME).mo,$(LANGUAGES))

.PHONY: all pack install clean

all: ${JS_FILES} ${MO_FILES} ${SCHEMA_FILE}
	@cp LICENSE.md dist
	@cp src/metadata.json dist
	@pnpm lint:dist
	@cd dist && ../node_modules/.bin/prettier --write .

node_modules: package.json
	@pnpm install

${JS_FILES}: node_modules
	@pnpm build

${MO_FILES}: $(PO_FILES)
	@mkdir -p `dirname $@`
	@msgfmt $< -o $@

${SCHEMA_FILE}: src/schemas/org.gnome.shell.extensions.$(EXTENSION_SLUG).gschema.xml
	@cp -r src/schemas dist

$(ZIP_FILE): all
	@cd dist && zip ../$(ZIP_FILE) -9r .

pack: $(ZIP_FILE)

install: $(ZIP_FILE)
	@rm -rf ~/.local/share/gnome-shell/extensions/$(EXTENSION_NAME)
	@unzip $(ZIP_FILE) -d ~/.local/share/gnome-shell/extensions/$(EXTENSION_NAME)
	@glib-compile-schemas src/schemas
	@mv src/schemas/gschemas.compiled ~/.local/share/gnome-shell/extensions/$(EXTENSION_NAME)/schemas/

clean:
	@rm -rf dist $(ZIP_FILE)
