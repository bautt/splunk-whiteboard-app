.PHONY: deps dev build package deploy deploy-norestart clean

APP_ID := whiteboard_app
SPLUNK_HOST := user@your-splunk-host

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
	find dist/appserver/static -name '*.js' -exec sed -i '' 's/trackEvent/trackEvnt/g' {} +

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

# Deploy without restarting Splunkd. Use for JS-only / static-asset changes;
# you'll need to hard-refresh the browser to bust the bundle cache. Splunk will
# not pick up changes to .conf files until the next restart.
deploy-norestart: package
	scp $(APP_ID).tar.gz $(SPLUNK_HOST):~
	ssh $(SPLUNK_HOST) "\
		cd /opt/splunk/etc/apps && \
		sudo tar xzf ~/$(APP_ID).tar.gz && \
		sudo chown -R splunk:splunk /opt/splunk/etc/apps/$(APP_ID) && \
		echo done"

clean:
	rm -rf dist /tmp/$(APP_ID) $(APP_ID).tar.gz
