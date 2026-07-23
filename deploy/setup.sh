#!/usr/bin/env bash
# translate_app — one-command deploy for TWO versions (main + current/test branch).
#
# What it does:
#   1. Ensures deploy/.env exists (copy from .env.example and fill it in if not).
#   2. Creates/updates a git worktree of the `main` branch at $MAIN_TREE.
#   3. Syncs the deploy Dockerfiles/nginx template into that worktree (main may not have them).
#   4. Builds all images and brings the stack up (skips cloudflared until TUNNEL_TOKEN is set).
#
# Run from anywhere:  bash deploy/setup.sh   (or: cd deploy && ./setup.sh)
set -euo pipefail

# --- resolve paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"                                   # = translate_app/deploy
REPO_ROOT="$(git rev-parse --show-toplevel)"       # = translate_app (test/current branch worktree)

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1. .env ---
[ -f .env ] || die "deploy/.env not found. Copy .env.example to .env, fill it in, then re-run."

MAIN_TREE="$(grep -E '^MAIN_TREE=' .env | cut -d= -f2- || true)"
MAIN_TREE="${MAIN_TREE:-../../translate_app_main}"
TUNNEL_TOKEN="$(grep -E '^TUNNEL_TOKEN=' .env | cut -d= -f2- || true)"

# Absolute worktree path (MAIN_TREE is written relative to this deploy/ dir).
MAIN_ABS="$(cd "$(dirname "$MAIN_TREE")" 2>/dev/null && pwd)/$(basename "$MAIN_TREE")" || \
  MAIN_ABS="$SCRIPT_DIR/$MAIN_TREE"

# --- 2. main-branch worktree ---
git -C "$REPO_ROOT" fetch origin main --quiet || log "fetch failed (offline?) — using local main"
if [ -d "$MAIN_ABS/.git" ] || git -C "$REPO_ROOT" worktree list | grep -q "$(basename "$MAIN_ABS")"; then
  log "Updating existing main worktree at $MAIN_ABS"
  git -C "$MAIN_ABS" checkout main --quiet
  git -C "$MAIN_ABS" pull --ff-only origin main --quiet || log "pull skipped (offline / diverged)"
else
  log "Creating main worktree at $MAIN_ABS"
  git -C "$REPO_ROOT" worktree add "$MAIN_ABS" main
fi

# --- 3. sync deploy infra into the main worktree (main branch may lack these files) ---
log "Syncing Dockerfiles + nginx template into the main worktree"
cp "$REPO_ROOT/backend/Dockerfile"                "$MAIN_ABS/backend/Dockerfile"
cp "$REPO_ROOT/backend/.dockerignore"             "$MAIN_ABS/backend/.dockerignore"
cp "$REPO_ROOT/frontend/Dockerfile"               "$MAIN_ABS/frontend/Dockerfile"
cp "$REPO_ROOT/frontend/.dockerignore"            "$MAIN_ABS/frontend/.dockerignore"
cp "$REPO_ROOT/frontend/default.conf.template"    "$MAIN_ABS/frontend/default.conf.template"

# --- 4. build + up ---
log "Building images (first run downloads Maven deps + Sudachi dict; be patient)"
docker compose build

if [ -n "$TUNNEL_TOKEN" ]; then
  log "Starting full stack (incl. cloudflared)"
  docker compose up -d
else
  log "TUNNEL_TOKEN is empty → starting everything EXCEPT cloudflared."
  log "Set TUNNEL_TOKEN in .env, then: docker compose up -d cloudflared"
  docker compose up -d \
    mysql similarity redis-main redis-test backend-main backend-test frontend-main frontend-test
fi

echo
log "Status:"
docker compose ps
echo
log "Done. Next:"
echo "   • Cloudflare tunnel → add Public Hostnames:"
echo "       main → http://frontend-main:80    test → http://frontend-test:80"
echo "   • Google Console → add both /login/oauth2/code/google redirect URIs."
echo "   • Logs:  docker compose -f $SCRIPT_DIR/docker-compose.yml logs -f backend-main"
