Secret hygiene checklist

Local only (never commit):
- apps/web/.env.local
- any .env* files

Repo protections already in place:
- .gitignore blocks all .env* files repo-wide
- Example template lives at apps/web/.env.example (no secrets)

Scanning (optional):
- Run `pnpm -C apps/web secretlint` to scan for secrets locally.
- Or run the bundled gitleaks.exe at project root:
  - `./gitleaks.exe detect -v --no-banner --redact`

Rotation:
- Immediately rotate any key that was ever committed or shared.

