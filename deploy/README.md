# translate_app — self-host deploy (two versions)

Runs **two versions side by side** on one machine with Docker Compose, exposed through a single
**Cloudflare Tunnel** (free HTTPS, no port-forwarding). Images are built locally (no registry).

| Version | Branch | URL | DB |
|---|---|---|---|
| main | `main` | `translate.thientnse.site` | `translate_app` |
| test | current branch (`Test-theme-by-Akira-second`) | `translate-test.thientnse.site` | `translate_app_test` |

Each version has its own **backend + frontend + redis**. They **share** one MySQL (a separate
database per version), one similarity service, and one tunnel — to save RAM.

```
Cloudflare (*.thientnse.site, HTTPS)
  └─ cloudflared ─┬─ translate.thientnse.site      → frontend-main → backend-main ┐
                  └─ translate-test.thientnse.site → frontend-test → backend-test ┼─ mysql (2 DBs)
                     (each frontend = nginx: SPA + proxy /api,/oauth2 to its backend) ┘  + redis x2
                                                                        similarity (shared, internal)
```

## Quick start

```sh
cd deploy
cp .env.example .env      # then fill it in (or let setup.sh generate a working one)
chmod 600 .env
bash setup.sh             # creates the main worktree, builds both versions, brings them up
```

`setup.sh` is idempotent — re-run it to rebuild after pulling new code on either branch.

## Prerequisites

- Docker Engine + Compose plugin (`docker compose version`).
- A Cloudflare account with the `thientnse.site` zone.
- **RAM**: two JVMs + MySQL is a few hundred MB each; `similarity` adds **~2–4 GB** (model +
  torch). On a small box, comment `similarity` out in `docker-compose.yml` until it's used.

## How the two branches are built

The compose builds the **test** version from this repo's working tree (`../backend`, `../frontend`)
and the **main** version from a git **worktree** at `$MAIN_TREE` (default `../../translate_app_main`).
`setup.sh` creates that worktree and copies the Dockerfiles + nginx template into it (the `main`
branch doesn't have them yet). Nothing to do by hand.

## Cloudflare Tunnel

1. Zero Trust → Networks → Tunnels → **Create a tunnel** (Cloudflared). Copy the **token** into
   `deploy/.env` as `TUNNEL_TOKEN=...`, then `docker compose up -d cloudflared`.
2. Add **two** Public Hostnames on that tunnel:
   - `translate.thientnse.site` → `http://frontend-main:80`
   - `translate-test.thientnse.site` → `http://frontend-test:80`

   The wildcard `*.thientnse.site` DNS already resolves both — no DNS change needed.

## Google OAuth (if used)

Register **both** redirect URIs in Google Cloud Console → Credentials:
- `https://translate.thientnse.site/login/oauth2/code/google`
- `https://translate-test.thientnse.site/login/oauth2/code/google`

and both JavaScript origins (the two https hosts).

## Verify

```sh
docker compose ps                                          # all healthy
curl -s https://translate.thientnse.site/actuator/health   # {"status":"UP"}
curl -s https://translate-test.thientnse.site/actuator/health
```

## Update / rollback one version

```sh
bash setup.sh                                   # rebuild both after pulling
docker compose build backend-test && docker compose up -d backend-test   # one service only
```

## Notes

- **No host ports** — reachable only via the tunnel. Use `docker compose logs -f <service>`.
- **`similarity` isn't wired into the app yet** — boots + caches the model but nothing calls it.
- **`PUBLIC_URL_*` have no trailing slash** — the OAuth handler appends the path itself.
- The `.env` here is generated with working dev secrets. Treat it as sensitive (chmod 600) and
  rotate the Google/Cloudinary/Gemini keys for anything public-facing.
