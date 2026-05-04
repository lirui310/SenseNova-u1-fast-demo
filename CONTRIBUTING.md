# Contributing

Thanks for helping improve this demo.

## Development Setup

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open:

```text
http://localhost:8000
```

## Before Opening a PR

Run:

```bash
python -m py_compile app/main.py
docker compose config
docker compose build
```

For dependency audit:

```bash
pip install pip-audit
pip-audit -r requirements.txt
```

## Security Rules

- Never commit `.env` or real API keys.
- Do not paste logs that include `SENSENOVA_API_KEY`.
- Do not add image upload controls unless the backend/model support has been intentionally changed.
- Keep `n` locked to `1` unless SenseNova U1 Fast behavior has been tested and documented.

## Code Style

- Keep the demo simple and dependency-light.
- Prefer server-side API calls so secrets stay off the browser.
- Use explicit validation for every user-controlled request field.
- Use DOM APIs and `textContent` for dynamic frontend text.
