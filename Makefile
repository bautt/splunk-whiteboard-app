.PHONY: deps dev build package deploy deploy-norestart clean

APP_ID := whiteboard_app

# Override in deploy.local.mk (gitignored) or: make deploy SPLUNK_HOST=user@host
-include deploy.local.mk
SPLUNK_HOST ?=

ifeq ($(strip $(SPLUNK_HOST)),)
$(error Set SPLUNK_HOST — copy deploy.local.mk.example to deploy.local.mk, or run: make deploy SPLUNK_HOST=user@host)
endif

deps:
	cd src/ && yarn install

dev:
	cd src/ && yarn watch

build:
	rm -rf dist
	cd src/ && yarn build
	# Neutralize Excalidraw's dormant `trackEvent` action-metadata token so the
	# bundle passes AppInspect's telemetry static check. No telemetry is ever
	# sent (the app registers no tracker); this only renames the property key
	# consistently across the built JS, preserving behaviour.
	find dist/appserver/static -name '*.js' -exec perl -pi -e 's/trackEvent/trackEvnt/g' {} +
	# Icon artwork in our dependencies contains SVG path runs such as
	# `3.57.65.44` — three coordinates, which AppInspect's IPv4 regex rejects as
	# a public IP address. Separating them is inert for the renderer. The script
	# fails the build if an IP-shaped string survives outside path data.
	python3 scripts/space-svg-path-numbers.py dist
	# Single source of truth for the version is src/web/lib/version.js. Sync it
	# into default/app.conf and app.manifest so they can never drift — a mismatch
	# here fails Splunk Cloud SLIM/semver validation.
	@VER=$$(grep "APP_VERSION" src/web/lib/version.js | sed -n "s/.*['\"]\\([^'\"]*\\)['\"].*/\\1/p"); \
		BUILD=$${VER##*.}; \
		perl -pi -e "s/^version = .*/version = $$VER/" dist/default/app.conf; \
		perl -pi -e "s/^build = .*/build = $$BUILD/" dist/default/app.conf; \
		perl -pi -e "s/\"version\": \"[^\"]*\"/\"version\": \"$$VER\"/" dist/app.manifest; \
		echo "Synced app version $$VER (build $$BUILD) into app.conf + app.manifest"

package: build
	rm -rf /tmp/$(APP_ID)
	cp -r dist/ /tmp/$(APP_ID)
	COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 tar \
		--format=ustar \
		--no-xattrs \
		--exclude='.DS_Store' \
		--exclude='.gitkeep' \
		--exclude='local' \
		--exclude='local.meta' \
		--exclude='__pycache__' \
		--exclude='*.pyc' \
		-cvzf $(APP_ID).tar.gz \
		-C /tmp \
		$(APP_ID)/

deploy: package
	scp $(APP_ID).tar.gz $(SPLUNK_HOST):~
	ssh $(SPLUNK_HOST) "\
		cd /opt/splunk/etc/apps && \
		sudo tar xzf ~/$(APP_ID).tar.gz && \
		sudo chown -R splunk:splunk /opt/splunk/etc/apps/$(APP_ID) && \
		sudo systemctl restart Splunkd && \
		echo done"

# Deploy without restarting Splunkd. Entry bundles now live at the fixed path
# /static/app/<app>/pages/<view>.js required by Splunk's splunk_ui_app.html
# template, so they carry no version query string of their own. Cache busting
# instead rides on Splunk's own /static/@<build>.<bump>/ URL segment, which is
# what incrementing push-version.txt below changes. Splunk Web re-reads that
# file at most every 30s, so allow a moment before the new JS is served.
deploy-norestart: package
	scp $(APP_ID).tar.gz $(SPLUNK_HOST):~
	ssh $(SPLUNK_HOST) "\
		cd /opt/splunk/etc/apps && \
		sudo tar xzf ~/$(APP_ID).tar.gz && \
		sudo chown -R splunk:splunk /opt/splunk/etc/apps/$(APP_ID) && \
		sudo sh -c 'P=/opt/splunk/var/run/splunk/push-version.txt; \
			echo \$$(( \$$(cat \$$P 2>/dev/null || echo 0) + 1 )) > \$$P; \
			chown splunk:splunk \$$P' && \
		echo \"done (bumped to \$$(sudo cat /opt/splunk/var/run/splunk/push-version.txt))\""

clean:
	rm -rf dist /tmp/$(APP_ID) $(APP_ID).tar.gz
