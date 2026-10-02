#!/bin/bash
# ダブルクリックで TubeTan を起動（Mac）
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js が見つかりません。https://nodejs.org/ からインストールしてください。"
  read -n 1 -s -r -p "何かキーを押すと閉じます"
  exit 1
fi
node server.js --open
