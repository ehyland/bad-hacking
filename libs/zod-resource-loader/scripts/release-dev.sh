#!/usr/bin/env bash

set -euo pipefail

initial_version=`cat package.json | jq -r '.version'`
tmp_tag="dev"
tmp_version="$initial_version-${tmp_tag}.$(date '+%Y-%m-%d-%H-%M-%S')"

clean_up () {
  ARG=$?
  pnpm npm version "$initial_version" --no-git-tag-version
  exit $ARG
} 

trap clean_up EXIT

pnpm run check
pnpm run build
pnpm npm version "$tmp_version" --no-git-tag-version
pnpm npm publish --tag "$tmp_tag"