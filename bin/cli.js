#!/usr/bin/env node

import { program } from "commander";
import { capture } from "../src/capture.js";

program
  .argument("<url>", "URL to navigate to")
  .option("-w, --wait <ms>", "grace period in ms after page load", parseInt, 3000)
  .option("-q, --quiet", "only show errors and warnings")
  .option("-b, --cookie <cookie...>", "cookies as name=value")
  .option("-u, --username <user>", "login username")
  .option("-p, --password <pass>", "login password")
  .option("--username-selector <sel>", "username input selector", "#username")
  .option("--password-selector <sel>", "password input selector", "#password")
  .option("--submit-selector <sel>", "submit button selector", 'button[type="submit"]')
  .option("--post-login-url <url>", "URL to navigate to after login")
  .option("--no-color", "disable color output")
  .action(async (url, opts) => {
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

    const code = await capture({
      url,
      wait: opts.wait,
      quiet: opts.quiet,
      color: opts.color,
      cookies,
      login,
    });

    process.exit(code);
  });

program.parse();
