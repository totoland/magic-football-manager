#!/usr/bin/env bash
# One-command deploy: build arm64 nginx image → ship to Pi containerd →
# bump the image tag in the pi-gitops manifest → Argo CD syncs.
# Usage:  deploy/deploy.sh [tag]   (tag defaults to current git short SHA)
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=/dev/null
source deploy/.deployrc

TAG="${1:-$(git rev-parse --short HEAD)}"
IMAGE="${IMAGE_NAME}:${TAG}"

echo "▸ build dist/ (precompile JSX, vendor React + fonts — no CDN)"
node build/build-dist.mjs

echo "▸ build ${IMAGE} (linux/arm64)"
docker build --platform linux/arm64 --provenance=false --sbom=false -t "${IMAGE}" .

echo "▸ ship to ${PI_SSH} containerd"
docker save "${IMAGE}" | ssh "${PI_SSH}" 'sudo k3s ctr images import -'

echo "▸ bump image in gitops (${GITOPS_PATH} on Pi)"
ssh "${PI_SSH}" "cd ${GITOPS_PATH} \
  && sed -i -E 's#(image: )${IMAGE_NAME}:.*#\1${IMAGE}#' apps/${APP_NAME}/deployment.yaml \
  && git add apps/${APP_NAME}/deployment.yaml \
  && (git commit -m 'deploy ${APP_NAME} ${TAG}' && git push || echo 'no change to commit')"

echo "✓ done — Argo CD syncs within ~30s"
echo "  http://${APP_NAME}.192-168-0-125.nip.io"
