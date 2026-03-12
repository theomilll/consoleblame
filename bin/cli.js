#!/usr/bin/env node

import { readFileSync } from "fs";
import chalk from "chalk";
import { program } from "commander";
import { capture } from "../src/capture.js";
import { textFormatter, ndjsonFormatter } from "../src/formatters.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

program.version(pkg.version);

function collect(val, arr) {
  arr.push(val);
  return arr;
}

program
  .argument("<url>", "URL to navigate to")
  .option("-w, --wait <ms>", "grace period in ms after page load", parseInt, 3000)
  .option("-q, --quiet", "only show errors and warnings")
  .option("--json", "output newline-delimited JSON")
  .option("--wait-until <strategy>", "load|domcontentloaded|networkidle0|networkidle2", "networkidle0")
  .option("-e, --eval <expr>", "JS expression to evaluate after wait (repeatable)", collect, [])
  .option("--fail-on <types>", "comma-separated: error,warning,pageerror,requestfailed,httperror,4xx,5xx,eval-error,eval-falsy", "error,pageerror")
  .option("-t, --timeout <ms>", "total execution timeout in ms", parseInt)
  .option("--max-events <n>", "cap output to N events", parseInt)
  .option("--filter <regex>", "regex filter on event text")
  .option("--no-summary", "suppress summary line")
  .option("-b, --cookie <cookie...>", "cookies as name=value")
  .option("-u, --username <user>", "login username")
  .option("-p, --password <pass>", "login password")
  .option("--username-selector <sel>", "username input selector", "#username")
  .option("--password-selector <sel>", "password input selector", "#password")
  .option("--submit-selector <sel>", "submit button selector", 'button[type="submit"]')
  .option("--post-login-url <url>", "URL to navigate to after login")
  .option("--no-color", "disable color output")
  .action(async (url, opts) => {
    if (!opts.color) chalk.level = 0;

    if (!/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
    }

    const domain = new URL(url).hostname;
    const cookies = (opts.cookie || []).map((c) => {
      const [name, ...rest] = c.split("=");
      return { name, value: rest.join("="), domain };
    });

    const login =
      opts.username && opts.password
        ? {
            username: opts.username,
            password: opts.password,
            usernameSelector: opts.usernameSelector,
            passwordSelector: opts.passwordSelector,
            submitSelector: opts.submitSelector,
            postLoginUrl: opts.postLoginUrl,
          }
        : undefined;

    const formatter = opts.json
      ? ndjsonFormatter({ quiet: opts.quiet })
      : textFormatter({ quiet: opts.quiet });

    const code = await capture({
      url,
      wait: opts.wait,
      cookies,
      login,
      formatter,
      waitUntil: opts.waitUntil,
      evals: opts.eval,
      failOn: opts.failOn,
      timeout: opts.timeout,
      maxEvents: opts.maxEvents,
      filter: opts.filter,
      noSummary: !opts.summary,
    });

    process.exit(code);
  });

program.parse();
