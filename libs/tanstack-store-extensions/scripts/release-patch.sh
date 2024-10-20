#!/usr/bin/env bash

set -euo pipefail

pnpm run check
pnpm run build
pnpm npm version patch --no-git-tag-version
pnpm npm publish --tag "latest"

echo ""
echo "Published, install with:"
echo ""

echo "  pnpm add $(yq -r '.name' package.json)@$(yq -r '.version' package.json)"
echo ""