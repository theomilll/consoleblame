import chalk from "chalk";

const colorMap = {
  log: (msg) => msg,
  info: (msg) => chalk.blue(msg),
  warning: (msg) => chalk.yellow(msg),
  error: (msg) => chalk.red(msg),
  debug: (msg) => chalk.gray(msg),
};

const quietTypes = new Set(["log", "info", "debug"]);
const webpackInternalRe = /webpack-internal:\/\/\/\(app-pages-browser\)\/\.\//g;

function formatLocation(location) {
  if (!location || !location.url) return "";
  let source = location.url;
  source = source.replace(webpackInternalRe, "");
  if (location.line != null) source += `:${location.line}`;
  return chalk.dim(`  ← ${source}`);
}

export function textFormatter({ quiet = false } = {}) {
  return (event) => {
    if (event.kind === "summary") {
      const c = event.counts;
      const parts = [];
      if (c.error) parts.push(`${c.error} error${c.error > 1 ? "s" : ""}`);
      if (c.warning) parts.push(`${c.warning} warning${c.warning > 1 ? "s" : ""}`);
      if (c.pageerror) parts.push(`${c.pageerror} page error${c.pageerror > 1 ? "s" : ""}`);
      if (c.requestfailed) parts.push(`${c.requestfailed} failed request${c.requestfailed > 1 ? "s" : ""}`);
      if (c.httperror) parts.push(`${c.httperror} HTTP error${c.httperror > 1 ? "s" : ""}`);

      if (event.evalResults?.length) {
        const evalErrors = event.evalResults.filter(r => r.error).length;
        const evalFalsy = event.evalResults.filter(r => !r.error && !r.result).length;
        if (evalErrors) parts.push(`${evalErrors} eval error${evalErrors > 1 ? "s" : ""}`);
        if (evalFalsy) parts.push(`${evalFalsy} eval falsy`);
      }

      if (event.firstError?.kind === "fatal") parts.push("fatal");

      const secs = (event.duration / 1000).toFixed(1);
      if (parts.length === 0) parts.push(event.exitCode ? "failed" : "clean");
      return chalk.dim(`Summary: ${parts.join(", ")} (${secs}s)`);
    }

    if (event.kind === "eval") {
      if (event.level === "error") {
        return chalk.red(`[eval] ${event.expr} → Error: ${event.text}`);
      }
      return chalk.cyan(`[eval] ${event.expr} → ${event.text}`);
    }

    if (event.kind === "fatal") {
      return chalk.red(`Fatal: ${event.text}`);
    }

    if (event.kind === "pageerror") {
      return chalk.red(`[pageerror] ${event.text}`) + formatLocation(event.location);
    }

    if (event.kind === "requestfailed") {
      return chalk.red(`[requestfailed] ${event.text}`);
    }

    if (event.kind === "httperror") {
      return chalk.red(`[${event.level}] ${event.text}`);
    }

    // console events
    if (quiet && quietTypes.has(event.level)) return null;

    const colorFn = colorMap[event.level] || colorMap.log;
    const prefix = event.level === "log" ? "" : `[${event.level}] `;

    let displayText = event.text;
    if (event.args && event.args.length > 0) {
      const argsStr = event.args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a, (_, v) => typeof v === "bigint" ? v.toString() : v)))
        .join(" ");
      if (argsStr.length > displayText.length) displayText = argsStr;
    }

    return colorFn(`${prefix}${displayText}`) + formatLocation(event.location);
  };
}

export function ndjsonFormatter({ quiet = false } = {}) {
  return (event) => {
    if (quiet && event.kind === "console" && quietTypes.has(event.level)) return null;
    return JSON.stringify(event, (_, v) => typeof v === "bigint" ? v.toString() : v);
  };
}
