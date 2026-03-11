---
name: consoleblame
description: |
  CLI tool that launches headless Chromium, navigates to a URL, and streams browser console output to the terminal.
  Use when: debugging console errors on a page, checking for warnings/errors, CI gating on console.error output,
  or verifying a deployed page produces no console noise.
---

# consoleblame

Headless Chromium console capture — visits a URL, prints every `console.*` call and page error to stdout, exits 1 if errors found.

## Installation

Not published to npm. Use locally:

```bash
# from the consoleblame directory
npm link          # then use `consoleblame` anywhere
# or run directly
node bin/cli.js <url>
```

## Usage

```
consoleblame <url> [options]
```

URLs without a protocol get `http://` prepended automatically.

## Options

| Flag | Description | Default |
|---|---|---|
| `-w, --wait <ms>` | Grace period after page load | `3000` |
| `-q, --quiet` | Only show `warning`, `error`, `pageerror`, `requestfailed` | off |
| `-b, --cookie <cookie...>` | Cookies as `name=value` (repeatable) | none |
| `-u, --username <user>` | Login username | none |
| `-p, --password <pass>` | Login password | none |
| `--username-selector <sel>` | Username input selector | `#username` |
| `--password-selector <sel>` | Password input selector | `#password` |
| `--submit-selector <sel>` | Submit button selector | `button[type="submit"]` |
| `--post-login-url <url>` | URL to navigate after login | none |
| `--no-color` | Disable color output | off |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No `console.error` or `pageerror` events |
| `1` | At least one `console.error` or `pageerror` occurred |

## Common patterns

```bash
# basic scan
consoleblame https://example.com

# only errors and warnings
consoleblame https://example.com -q

# with cookies
consoleblame https://example.com -b "session=abc123" -b "lang=en"

# login then check a protected page
consoleblame https://example.com/login -u admin -p secret --post-login-url https://example.com/dashboard

# CI gate — fail pipeline if console errors exist
consoleblame https://staging.example.com -q -w 5000 || exit 1
```

## Gotchas

- **`requestfailed` does NOT set exit code 1** — only `console.error` and `pageerror` do. Failed network requests are printed but don't affect the exit code.
- **Login requires both `-u` and `-p`** — providing only one is silently ignored (no login attempt).
- **Login happens after navigating to the URL**, not before. The URL should be the login page itself.
- **`--wait` is additive** — it's a grace period *after* page load (`networkidle0`), not a total timeout.
- **Cookies are scoped to the target URL's hostname only.**
- **`--quiet` suppresses `log`, `info`, and `debug`** — `warning`, `error`, `pageerror`, and `requestfailed` still print.
