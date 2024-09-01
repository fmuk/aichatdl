#!/bin/bash

VERSION=v$(grep '"version"' manifest.json | awk -F '"' '{print $4}')
PROJECT_NAME="aichatdl"
RELEASE_DIR=${PROJECT_NAME}-${VERSION}
ZIP_NAME=${PROJECT_NAME}-${VERSION}

mkdir -p $RELEASE_DIR releases
cp -r src/ README.md LICENSE manifest.json $RELEASE_DIR/
zip -r ${ZIP_NAME}.zip $RELEASE_DIR
rm -rf $RELEASE_DIR
mv -i ${ZIP_NAME}.zip releases
echo "Release ${PROJECT_NAME}-${VERSION}.zip created successfully!"

