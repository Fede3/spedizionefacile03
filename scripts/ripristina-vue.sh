#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_FILE="nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue"

cd "$ROOT_DIR"

echo "[1/4] Ripristino file critico: $TARGET_FILE"
git checkout -- "$TARGET_FILE"

echo "[2/4] Pulizia cache Nuxt locale"
rm -rf nuxt-spedizionefacile-master/.nuxt nuxt-spedizionefacile-master/.output || true

echo "[3/4] Build di validazione"
cd nuxt-spedizionefacile-master
npm run -s build

echo "[4/4] OK - file Vue ripristinato e build completata"
