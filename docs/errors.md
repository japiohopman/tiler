# Tiler Runtime Error Log

This is the chronological record of reproducible runtime errors discovered during real application testing.

## Rules

- Record errors from real runtime tests, not hypothetical failures.
- Never store API keys, tokens, cookies, or other secrets here.
- Keep previous entries; do not overwrite history.
- Include branch/commit context when known.
- Record whether the error was fixed, confirmed upstream, or remains open.
- Link the related PR/task when available.

## Entry template

```text
## YYYY-MM-DD — Short error title

Branch:
Commit:
Severity: P0 / P1 / P2 / P3
Status: OPEN / FIXED / UPSTREAM / WONTFIX

### Symptom

### Reproduction

### Evidence

### Root cause

### Fix / next action

### Verification

### Related PR / task
```

## Known issue: Pixazo SDXL HTTP 500

Status: OPEN / INVESTIGATE

The Pixazo SDXL generation endpoint has returned HTTP 500 during real generation tests.

Endpoint:

`POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage`

The exact cause must be re-established against the current provider request contract whenever the provider integration changes. Do not assume that a historical provider-side diagnosis remains valid after payload changes.

No credentials are recorded in this document.
