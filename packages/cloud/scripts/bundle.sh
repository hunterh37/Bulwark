#!/bin/sh
# Bundles the edge runner into one file and packs the Bulwark Edge kit.
set -eu
cd "$(dirname "$0")/.."
D=public/download
rm -rf build/bulwark-edge
mkdir -p $D build/bulwark-edge
npx esbuild src/runner/cli.ts --bundle --platform=node --format=esm --target=node20 --outfile=$D/bulwark-runner.mjs --log-level=warning
cp $D/bulwark-runner.mjs ../../deploy/edge/Dockerfile ../../deploy/edge/docker-compose.yml ../../deploy/edge/install.sh ../../deploy/edge/README.md build/bulwark-edge/
(cd build/bulwark-edge && F="bulwark-runner.mjs Dockerfile docker-compose.yml install.sh README.md" && (sha256sum $F 2>/dev/null || shasum -a 256 $F) > ../SUMS && mv ../SUMS SHA256SUMS)
tar -czf $D/bulwark-edge-1.1.0.tar.gz -C build bulwark-edge
(cd $D && (sha256sum bulwark-runner.mjs bulwark-edge-1.1.0.tar.gz 2>/dev/null || shasum -a 256 bulwark-runner.mjs bulwark-edge-1.1.0.tar.gz) > SHA256SUMS.txt)
cp ../../deploy/edge/docker-compose.yml $D/docker-compose.yml
cp ../../docs/Bulwark-Infrastructure.pdf $D/Bulwark-Infrastructure.pdf
echo bundled
