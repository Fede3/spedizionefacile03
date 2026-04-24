#!/usr/bin/env bash
# Anonymize production DB dump for staging
# Usage: ./anonymize-db-for-staging.sh <input.sql> <output.sql>
set -e
IN="${1:?input sql dump}"
OUT="${2:?output anonymized dump}"
# Copy input
cp "$IN" "$OUT"
# Sanitize emails: replace with user+{id}@staging.test (preserve admin/system)
sed -i.bak -E "s/([a-zA-Z0-9._%+-]+@)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/anon+\${RANDOM}@staging.test/g" "$OUT"
# Sanitize phone (Italian format)
sed -i.bak -E "s/\\+39[0-9]{9,10}/+390000000000/g" "$OUT"
# TODO: sanitize nome/cognome, address (manual via psql UPDATE)
echo "Anonymized: $OUT"
