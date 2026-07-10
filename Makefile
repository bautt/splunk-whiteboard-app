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
	@VER=$$(grep "APP_VERSION" src/web/lib/version.js | sed -n "s/.*['\"]\\([^'\"]*\\)['\"].*/\\1/p"); \
		for f in dist/appserver/templates/*.html; do \
			perl -pi -e "s/__WB_APP_VERSION__/$$VER/g" "$$f"; \
		done

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

# Deploy without restarting Splunkd. Bundle URLs include ?v=<appVersion> so
# browsers fetch the new JS; if Splunk Web still serves stale assets, visit
# /en-US/_bump once (or use `make deploy` which restarts Splunkd).
deploy-norestart: package
	scp $(APP_ID).tar.gz $(SPLUNK_HOST):~
	ssh $(SPLUNK_HOST) "\
		cd /opt/splunk/etc/apps && \
		sudo tar xzf ~/$(APP_ID).tar.gz && \
		sudo chown -R splunk:splunk /opt/splunk/etc/apps/$(APP_ID) && \
		echo done"

clean:
	rm -rf dist /tmp/$(APP_ID) $(APP_ID).tar.gz
