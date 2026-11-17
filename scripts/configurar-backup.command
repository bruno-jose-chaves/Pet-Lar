#!/bin/bash
# Pet Lar · configura a cópia semanal do banco neste Mac (uma vez só). Dê duplo clique.
# Guarda a senha em ~/.petlar-backup-token e agenda o backup toda segunda às 09:00, salvando ao lado deste arquivo.
set -e
AQUI="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$AQUI/backups"
if [ ! -s "$HOME/.petlar-backup-token" ]; then
  printf "Cole a senha do backup (BACKUP_TOKEN) e tecle Enter: "; read -rs T; echo
  [ ${#T} -ge 24 ] || { echo "Senha curta demais."; exit 1; }
  (umask 077; printf '%s' "$T" > "$HOME/.petlar-backup-token")
fi
cp "$AQUI/backup.sh" "$HOME/.petlar-backup.sh"; chmod 700 "$HOME/.petlar-backup.sh"
PL="$HOME/Library/LaunchAgents/br.petlar.backup.plist"
cat > "$PL" <<P
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>br.petlar.backup</string>
<key>ProgramArguments</key><array><string>/bin/bash</string><string>$HOME/.petlar-backup.sh</string><string>$AQUI/backups</string></array>
<key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
<key>StandardOutPath</key><string>$HOME/.petlar-backup.log</string>
<key>StandardErrorPath</key><string>$HOME/.petlar-backup.log</string>
</dict></plist>
P
launchctl unload "$PL" 2>/dev/null || true; launchctl load "$PL"
echo "Rodando a primeira cópia agora..."; bash "$HOME/.petlar-backup.sh" "$AQUI/backups"
echo "Pronto. Cópia semanal agendada (segundas, 09:00)."; read -n1 -p "Tecle algo para fechar."
