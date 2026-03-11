# consoleblame

![consoleblame](https://i.ibb.co/5WWJwm9Z/image.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Launch headless Chromium, navigate to a URL, and stream browser console output to your terminal.

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
| `0` | No errors |
| `1` | `console.error`, page error, or fatal failure |

### Examples

```bash
# basic usage
consoleblame https://example.com

# wait longer, errors only
consoleblame https://example.com -w 10000 -q

# with cookies
consoleblame https://example.com -b session=abc123

# with login
consoleblame https://app.example.com -u admin -p secret --post-login-url https://app.example.com/dashboard
```

## License

[MIT](LICENSE)
