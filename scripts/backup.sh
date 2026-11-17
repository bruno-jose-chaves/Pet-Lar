#!/bin/bash
# Pet Lar · cópia do banco no notebook.
# Uso:  scripts/backup.sh [pasta-destino]
# A senha fica em ~/.petlar-backup-token (uma linha, mesmo valor do segredo BACKUP_TOKEN no Supabase).
# Padrão de destino: ./backups (já ignorada pelo git — os arquivos têm dados pessoais).
set -euo pipefail
DEST="${1:-$(dirname "$0")/../backups}"
TOKEN="${BACKUP_TOKEN:-$(cat "$HOME/.petlar-backup-token" 2>/dev/null || true)}"
[ -n "$TOKEN" ] || { echo "Falta a senha: crie ~/.petlar-backup-token" >&2; exit 1; }
mkdir -p "$DEST"; chmod 700 "$DEST"
ARQ="$DEST/petlar-$(date +%Y-%m-%d).json"
curl -fsS --max-time 60 -H "x-backup-token: $TOKEN" \
  "https://jyzqcazwargpywjmayoh.supabase.co/functions/v1/backup" -o "$ARQ.tmp"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert d.get('contagem'); print('ok:', d['contagem'])" "$ARQ.tmp"
mv "$ARQ.tmp" "$ARQ"; chmod 600 "$ARQ"
ls -1t "$DEST"/petlar-*.json | tail -n +13 | xargs -I{} rm -f {}   # mantém as 12 últimas
echo "Cópia salva em $ARQ"
