#!/bin/bash
# Le studio toujours allumé sur un Mac : il démarre tout seul à l'ouverture de ta session, et
# redémarre tout seul s'il s'arrête. Plus besoin de « npm start » à chaque fois.
#
#   npm run service:mac            installer (ou mettre à jour après un « git pull »)
#   npm run service:mac -- --stop  l'arrêter et ne plus le démarrer tout seul
set -euo pipefail

LABEL="com.studio-des-agents"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/studio-des-agents.log"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="gui/$(id -u)"

if [[ "${1:-}" == "--stop" ]]; then
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "  ✓ Le studio est arrêté et ne démarrera plus tout seul."
  exit 0
fi

NODE="$(command -v node || true)"
CLAUDE="$(command -v claude || true)"
[[ -z "$NODE" ]] && { echo "  ✗ Node.js est introuvable : installe-le (https://nodejs.org)."; exit 1; }
[[ -z "$CLAUDE" ]] && echo "  ⚠ Claude Code est introuvable dans le PATH : le studio tournera en démo (installe-le, puis relance cette commande)."

echo "  … Je construis le studio"
(cd "$DIR" && node scripts/check-node.mjs && npx vite build --logLevel warn)

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
# le PATH du service : celui de Node, de Claude Code, de Homebrew (ffmpeg) et de Python
SVC_PATH="$(dirname "$NODE"):${CLAUDE:+$(dirname "$CLAUDE"):}/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>server/index.ts</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$SVC_PATH</string>
    ${CLAUDE:+<key>CLAUDE_BIN</key><string>$CLAUDE</string>}
    ${PORT:+<key>PORT</key><string>$PORT</string>}
    ${BUREAU_DIR:+<key>BUREAU_DIR</key><string>$BUREAU_DIR</string>}
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"

echo ""
echo "  ✓ Le studio tourne tout seul : http://localhost:${PORT:-4850}"
echo "    Il redémarre à chaque ouverture de session (et s'il plante)."
echo "    Son journal : ~/Library/Logs/studio-des-agents.log"
echo "    Pour l'arrêter : npm run service:mac -- --stop"
echo ""
echo "  Pour y accéder depuis ton iPhone : voir « Depuis ton téléphone » dans le README (Tailscale + mot de passe)."
