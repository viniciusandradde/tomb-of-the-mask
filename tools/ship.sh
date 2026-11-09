#!/usr/bin/env bash
# Publica com segurança: só commita/mescla se TODAS as verificações passarem.
# Uso: tools/ship.sh "mensagem do commit"
set -euo pipefail
cd "$(dirname "$0")/.."
MSG="${1:?mensagem do commit}"
for f in pwa/js/*.js pwa/sw.js server.js; do node --check "$f"; done
node tools/validate.js
SHOTS="${SHOTS:-/tmp/tumba-shots}" node tools/e2e.js > /tmp/tumba-e2e.log 2>&1 || { tail -30 /tmp/tumba-e2e.log; echo "E2E FALHOU: nada foi publicado"; exit 1; }
grep -q "e2e ok" /tmp/tumba-e2e.log
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git add -A
git commit -q -m "$MSG

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0126L2T4JtTxqUNXm4kTD5H1" || echo "nada novo para commitar"
git push -u origin "$BRANCH" 2>&1 | tail -1
git fetch -q origin master
git checkout -q master
git reset -q --hard origin/master
git merge --no-ff -q "$BRANCH" -m "Mescla: $(echo "$MSG" | head -1)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0126L2T4JtTxqUNXm4kTD5H1"
git push origin master 2>&1 | tail -1
git checkout -q "$BRANCH"
echo "PUBLICADO: $(git log --oneline -1 origin/master)"
