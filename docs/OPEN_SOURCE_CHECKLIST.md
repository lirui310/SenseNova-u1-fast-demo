# Open Source Checklist

Use this checklist before publishing the repository.

## Required

- [ ] Delete local `.env` from any export/archive.
- [ ] Confirm `.env` and `.env.*` are ignored by Git.
- [ ] Run a secret scan:

```bash
rg -n "sk-|api_key|SENSENOVA_API_KEY|OPENAI_API_KEY|Bearer" -g '!.env' -g '!.env.*' -g '!.venv'
```

- [ ] Run Python syntax check:

```bash
python -m py_compile app/main.py
```

- [ ] Run dependency audit:

```bash
pip-audit -r requirements.txt
```

- [ ] Build Docker image:

```bash
docker compose build
```

- [ ] Add a license file selected by the maintainer.
- [ ] Confirm screenshots and README examples contain no real keys.

## Recommended Before Public Deployment

- [ ] Add authentication.
- [ ] Add rate limiting.
- [ ] Add request body size limits at reverse proxy or gateway.
- [ ] Add cost/quota alerts for the SenseNova account.
- [ ] Disable or protect access to logs that may include prompts or generated image URLs.
- [ ] Configure HTTPS.

## Current Security Posture

- API key is read only by the FastAPI backend.
- `.env` and `.env.*` are ignored by Git and Docker build context.
- Docker container runs as a non-root user.
- Frontend has no image upload control.
- Backend validates prompt, `n`, and `size`.
- Dependency audit on direct pinned requirements currently reports no known vulnerabilities.
