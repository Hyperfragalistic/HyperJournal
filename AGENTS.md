# Agent instructions

## Secrets

This repository is public. Anything committed is world-readable, and git history keeps it after a later deletion.

- Never commit API keys, OAuth tokens, refresh tokens, access tokens, private keys, passwords, or other credentials. Put them in environment variables or the deployment secret manager.
- `.env` and `.env.*` are gitignored. Committed env files may contain placeholder names only. This repo tracks `.env.local.example`; `.env.example` is also allowed.
- Do not print, log, quote, or commit a secret value. Refer to a finding by file, line, commit, rule id, and gitleaks fingerprint.
- Gitleaks v8.30.1 runs on staged changes in the pre-commit hook and over the full git history in `.github/workflows/secret-scan.yml`. Do not skip the hook to land a credential.
- Suppress a finding only when it is a clear false positive: a public on-chain address, fixture or test data, a vendored minified library, or an account identifier. Record the exact fingerprint in `.gitleaksignore` with a one-line justification. Do not allowlist a broad directory.
- If a finding looks like a real credential, do not suppress it and do not rewrite history. Report the location and credential type with the value redacted so it can be rotated.
