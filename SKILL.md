---
name: consoleblame
description: |
  CLI tool that launches headless Chromium, navigates to a URL, and streams browser console output to the terminal.
  Use when: debugging console errors on a page, checking for warnings/errors, CI gating on console.error output,
  or verifying a deployed page produces no console noise.
---

# consoleblame

Headless Chromium console capture — visits a URL, prints every `console.*` call and page error to stdout, exits 1 if errors found.

## Quick scan

```bash
consoleblame --wait-until load -w 1000 -q <url>
```

## Installation

```bash
npm install -g consoleblame
```

Or via Homebrew:

```bash
brew install theomilll/consoleblame/consoleblame
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
| `--json` | Output newline-delimited JSON (one event per line) | off |
| `--wait-until <strategy>` | `load\|domcontentloaded\|networkidle0\|networkidle2` | `networkidle0` |
| `-e, --eval <expr>` | JS expression to evaluate after wait (repeatable) | none |
| `--fail-on <types>` | Comma-separated: `error,warning,pageerror,requestfailed,httperror,4xx,5xx,eval-error,eval-falsy` | `error,pageerror` |
| `-t, --timeout <ms>` | Total execution timeout in ms | none |
| `--max-events <n>` | Cap output to N events | none |
| `--filter <regex>` | Regex filter on event text | none |
| `--no-summary` | Suppress summary line | off |
| `-b, --cookie <cookie...>` | Cookies as `name=value` (repeatable) | none |
| `-u, --username <user>` | Login username | none |
| `-p, --password <pass>` | Login password | none |
| `--username-selector <sel>` | Username input selector | `#username` |
| `--password-selector <sel>` | Password input selector | `#password` |
| `--submit-selector <sel>` | Submit button selector | `button[type="submit"]` |
| `--post-login-url <url>` | URL to navigate after login | none |
| `--no-color` | Disable color output | off |

## Event model (v0.3)

Every console/page event is represented internally as:

```json
{ "kind": "console|pageerror|requestfailed|httperror|eval|summary|fatal", "level": "...", "text": "...", "args": [...], "location": {...}, "timestamp": "..." }
```

With `--json`, each event is emitted as one NDJSON line. Pipe to `jq` for filtering.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No `--fail-on` conditions matched |
| `1` | At least one `--fail-on` condition matched, or fatal failure |

## For AI Agents

Recommended combos for fast, bounded, predictable output:

```bash
# bounded scan — at most 10 events, 10s hard timeout
consoleblame --max-events 10 -t 10000 --json -q <url>

# errors only, exit-code check, no summary noise
consoleblame -q --no-summary --wait-until load -w 1000 <url>

# filter for specific patterns
consoleblame --filter "error|warn" --json --max-events 20 <url>

# fastest possible check — load event only, 1s grace, 5s timeout
consoleblame --wait-until load -w 1000 -t 5000 -q <url>
```

### Context minimization

| Goal | Flags |
|---|---|
| Reduce output volume | `--quiet` (drops log/info/debug), `--max-events N` |
| Structured parsing | `--json` (NDJSON, one event per line) |
| Only care about exit code | `--no-summary -q` |
| Focus on specific issues | `--filter <regex>` |
| Prevent hangs | `-t <ms>` (hard timeout covers navigation + wait) |

## Common patterns

```bash
# basic scan
consoleblame https://example.com

# structured output for agents/CI
consoleblame --json https://example.com | jq '.args'

# faster return on websocket/polling apps
consoleblame --wait-until load https://example.com

# evaluate JS expressions after page load
consoleblame -e "document.title" -e "window.__NEXT_DATA__.buildId" https://example.com

# JSON eval results
consoleblame --json -e "document.title" https://example.com | jq 'select(.kind=="eval")'

# fail on 4xx/5xx HTTP responses too
consoleblame --fail-on error,pageerror,httperror,4xx,5xx https://example.com

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

- **`--fail-on` controls exit code** — default is `error,pageerror`. Use `--fail-on` to customize which event types trigger exit 1.
- **4xx/5xx tracking requires explicit opt-in** — add `httperror`, `4xx`, or `5xx` to `--fail-on` to fail on HTTP error responses.
- **Login requires both `-u` and `-p`** — providing only one is silently ignored (no login attempt).
- **Login happens after navigating to the URL**, not before. The URL should be the login page itself.
- **`--wait` is additive** — it's a grace period *after* page load, not a total timeout. Use `--timeout` for a hard wall-clock limit.
- **`--timeout` starts from the very beginning** — covers browser launch, navigation, wait, and evals.
- **`--max-events` triggers early exit** — once the cap is hit, the browser closes immediately and the process exits.
- **`--filter` applies to all events except summary/fatal** — fail-on checks still run on filtered-out events (exit code is accurate).
- **`--wait-until` changes navigation strategy** — use `load` for apps with websockets/polling that cause `networkidle0` to hang.
- **`--eval` runs after the wait period** — expressions see the fully loaded page state.
- **Cookies are scoped to the target URL's hostname only.**
- **`--quiet` suppresses `log`, `info`, and `debug`** — `warning`, `error`, `pageerror`, and `requestfailed` still print.
- **A summary event is always emitted last** — in JSON mode it includes counts, eval results, duration, and exit code. Suppress with `--no-summary`.
