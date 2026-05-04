# Security Policy

## Supported Scope

This repository is a small demo for SenseNova U1 Fast image generation. It is intended for local development, internal testing, and simple demonstrations.

It does not include:

- User authentication
- Rate limiting
- Billing controls
- Persistent storage
- Multi-tenant isolation

Do not expose this demo directly to the public internet without adding those controls.

## Secrets

The SenseNova API key must stay server-side.

- Store it in `.env` as `SENSENOVA_API_KEY`.
- Never commit `.env`, `.env.*`, screenshots containing keys, terminal output containing keys, or Docker Compose rendered config containing keys.
- Rotate the key immediately if it is leaked.

The frontend never receives the API key. Browser requests go to the local FastAPI backend, and the backend calls SenseNova.

## Network and Cost Risks

Anyone who can access the running backend can trigger image generation and consume quota. Before public deployment, add:

- Authentication
- Per-user and per-IP rate limiting
- Request body size limits at the proxy layer
- Spending alerts or quota caps
- Access logs with secrets redacted

## Input Handling

The demo validates:

- Prompt is not empty
- Prompt estimated token count is at most `4096`
- Prompt character count is at most `20000`
- `n` must be exactly `1`
- `size` must be one of the documented U1 Fast sizes

The frontend uses DOM APIs and `textContent` for dynamic text, avoiding direct HTML injection for user-controlled strings.

## Dependency Auditing

Run dependency audit before publishing releases:

```bash
pip install pip-audit
pip-audit -r requirements.txt
```

If your environment blocks the default cache directory, use a writable cache path:

```bash
pip-audit -r requirements.txt --cache-dir /tmp/pip-audit-cache
```

You can also audit the active virtual environment:

```bash
pip-audit --path .venv/lib/python*/site-packages --cache-dir /tmp/pip-audit-cache
```

## Reporting a Vulnerability

If you discover a security issue, please do not open a public issue with exploit details or secrets.

Report privately to the maintainer through the repository security advisory feature, or contact the maintainer using the project’s preferred private channel.

Please include:

- Affected version or commit
- Steps to reproduce
- Impact
- Suggested mitigation, if known
