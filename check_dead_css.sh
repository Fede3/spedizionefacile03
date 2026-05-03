#!/bin/bash
INPUT=$1
LABEL=$2
echo "=== $LABEL ==="
while IFS= read -r class; do
  cls="${class#.}"
  count=$(grep -rl "${cls}" apps/web --include='*.vue' --include='*.ts' --include='*.js' 2>/dev/null | wc -l)
  echo "$count $class"
done < "$INPUT" | sort -n
