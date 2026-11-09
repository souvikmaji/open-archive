#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
mkdir "$staging/icons"
cp manifest.json service-worker.js popup.html popup.js "$staging/"
cp icons/icon_*.png "$staging/icons/"

web-ext lint --source-dir "$staging"
web-ext build --source-dir "$staging" --artifacts-dir "$PWD/web-ext-artifacts" --overwrite-dest
