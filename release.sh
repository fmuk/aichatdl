#!/bin/bash

VERSION=v$(grep '"version"' manifest.json | awk -F '"' '{print $4}')
PROJECT_NAME="aichatdl"
RELEASE_DIR=$PROJECT_NAME

mkdir -p $RELEASE_DIR
cp -r src/ README.md LICENSE manifest.json $RELEASE_DIR/
zip -r ${PROJECT_NAME}-${VERSION}.zip $RELEASE_DIR
rm -rf $RELEASE_DIR
echo "Release ${PROJECT_NAME}-${VERSION}.zip created successfully!"

