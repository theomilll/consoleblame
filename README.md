# consoleblame

<img src="assets/hero.png" alt="consoleblame" width="300">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Launch headless Chromium, navigate to a URL, and stream browser console output to your terminal.

## Why

I got a little annoyed at how AI agents have to spin up a whole separate browser just to check console logs, and how I'd have to manually copy stuff over myself. So I made this CLI tool that lets you check browser console output straight from your terminal. Figured it might be useful for someone else too, so here it is.

## Install

### Homebrew

```bash
# 1. Add the tap (registers the custom formula repository)
brew tap theomilll/consoleblame

# 2. Install (pulls node as a dependency, runs npm install, symlinks the binary)
brew install consoleblame
```

Or as a one-liner:

```bash
brew install theomilll/consoleblame/consoleblame
```

### npm

```bash
npm install -g consoleblame
```

### Local development

```bash
git clone https://github.com/theomilll/consoleblame.git
cd consoleblame && npm install && npm link
```

## Usage

```bash
consoleblame <url> [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-w, --wait <ms>` | Grace period after page load | `3000` |
| `-q, --quiet` | Only show errors and warnings | |
| `--json` | Output newline-delimited JSON | |
| `--wait-until <strategy>` | `load\|domcontentloaded\|networkidle0\|networkidle2` | `networkidle0` |
| `-e, --eval <expr>` | JS expression to evaluate after wait (repeatable) | |
| `--fail-on <types>` | Comma-separated: `error,warning,pageerror,requestfailed,httperror,4xx,5xx,eval-error,eval-falsy` | `error,pageerror` |
| `-t, --timeout <ms>` | Total execution timeout in ms | |
| `--max-events <n>` | Cap output to N events | |
| `--filter <regex>` | Regex filter on event text | |
| `--no-summary` | Suppress summary line | |
| `-b, --cookie <cookie...>` | Cookies as `name=value` | |
| `-u, --username <user>` | Login username | |
| `-p, --password <pass>` | Login password | |
| `--username-selector <sel>` | Username input selector | `#username` |
| `--password-selector <sel>` | Password input selector | `#password` |
| `--submit-selector <sel>` | Submit button selector | `button[type="submit"]` |
| `--post-login-url <url>` | URL to navigate to after login | |
| `--no-color` | Disable color output | |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No errors detected (per `--fail-on`) |
| `1` | Matched a `--fail-on` condition or fatal failure |

### Examples

```bash
# basic usage
consoleblame https://example.com

# structured JSON output, pipe to jq
consoleblame --json https://example.com | jq '.args'

# faster return on simple pages (no long-polling wait)
consoleblame --wait-until load https://example.com

# evaluate JS after page load
consoleblame -e "document.title" -e "window.location.href" https://example.com

# JSON eval results
consoleblame --json -e "document.title" https://example.com | jq 'select(.kind=="eval")'

# fail on errors, HTTP errors, or 4xx responses
consoleblame --fail-on error,httperror,4xx https://example.com

# bounded output with hard timeout (great for agents/CI)
consoleblame --max-events 10 -t 10000 --json -q https://example.com

# filter for specific patterns
consoleblame --filter "error|warn" -q https://example.com

# exit-code only, no output noise
consoleblame -q --no-summary https://example.com

# wait longer, errors only
consoleblame https://example.com -w 10000 -q

# with cookies
consoleblame https://example.com -b session=abc123

# with login
consoleblame https://app.example.com -u admin -p secret --post-login-url https://app.example.com/dashboard
```

## License

[MIT](LICENSE)
