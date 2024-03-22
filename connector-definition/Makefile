.DEFAULT_GOAL := build
SHELL = /usr/bin/env bash

.PHONY: build
build: dist/connector-definition.tgz

.PHONY: clean
clean:
	rm -rf dist

dist dist/.hasura-connector:
	mkdir dist
	mkdir dist/.hasura-connector

dist/.hasura-connector/connector-metadata.yaml: DOCKER_IMAGE ?= $(error The DOCKER_IMAGE variable must be defined)
dist/.hasura-connector/connector-metadata.yaml: connector-metadata.yaml dist/.hasura-connector
	cp -f connector-metadata.yaml dist/.hasura-connector/
	yq -i '.packagingDefinition.dockerImage = "$(DOCKER_IMAGE)"' dist/.hasura-connector/connector-metadata.yaml

dist/connector-definition.tgz: dist/.hasura-connector/connector-metadata.yaml
	shopt -s dotglob && cd dist && tar -czvf connector-definition.tgz *