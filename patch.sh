#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if ! command -v node >/dev/null 2>&1 || ! command -v npx >/dev/null 2>&1; then
  printf '%s\n' "Error: Node.js and npm/npx are required to build the bookmarklet." >&2
  exit 1
fi

tmp_file=$(mktemp "./.AI-Assistant.js.XXXXXX")
trap 'rm -f "$tmp_file"' EXIT

npx --yes terser src/thejavascriptbehinditall.js --compress --mangle --output "$tmp_file"
node -e 'const fs = require("fs"); const path = process.argv[1]; const code = fs.readFileSync(path, "utf8").trim(); fs.writeFileSync(path, `javascript:${code}\n`);' "$tmp_file"
mv -- "$tmp_file" "AI Assistant.js"
trap - EXIT

printf '%s\n' "Updated AI Assistant.js from src/thejavascriptbehinditall.js"
