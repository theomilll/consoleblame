import puppeteer from "puppeteer";
import chalk from "chalk";
import { login as performLogin } from "./login.js";

const colorMap = {
  log: (msg) => msg,
  info: (msg) => chalk.blue(msg),
  warning: (msg) => chalk.yellow(msg),
  error: (msg) => chalk.red(msg),
  debug: (msg) => chalk.gray(msg),
};

const quietTypes = new Set(["log", "info", "debug"]);

export async function capture({ url, wait = 3000, quiet = false, color = true, cookies = [], login }) {
  if (!color) chalk.level = 0;

  let hasError = false;
  let browser;

  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    if (cookies.length) await page.setCookie(...cookies);

    page.on("console", (msg) => {
      const type = msg.type();
      if (quiet && quietTypes.has(type)) return;

      const colorFn = colorMap[type] || colorMap.log;
      const prefix = type === "log" ? "" : `[${type}] `;

      let suffix = "";
      const loc = msg.location();
      if (loc && loc.url) {
        let source = loc.url;
        source = source.replace(/webpack-internal:\/\/\/\(app-pages-browser\)\/\.\//g, "");
        if (loc.lineNumber != null) source += `:${loc.lineNumber}`;
        suffix = chalk.dim(`  ← ${source}`);
      }

      console.log(colorFn(`${prefix}${msg.text()}`) + suffix);

      if (type === "error") hasError = true;
    });

    page.on("pageerror", (err) => {
      console.log(chalk.red(`[pageerror] ${err.message}`));
      hasError = true;
    });

    page.on("requestfailed", (req) => {
      console.log(chalk.red(`[requestfailed] ${req.method()} ${req.url()} — ${req.failure().errorText}`));
    });

    await page.goto(url, { waitUntil: "networkidle0" });
    if (login) {
      await performLogin(page, login);
      if (login.postLoginUrl) await page.goto(login.postLoginUrl, { waitUntil: "networkidle0" });
    }
    await new Promise((r) => setTimeout(r, wait));
  } catch (err) {
    console.error(chalk.red(`Fatal: ${err.message}`));
    hasError = true;
  } finally {
    if (browser) await browser.close();
  }

  return hasError ? 1 : 0;
}
