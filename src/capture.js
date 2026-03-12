import puppeteer from "puppeteer";
import { login as performLogin } from "./login.js";
import { textFormatter } from "./formatters.js";

const stackLocationRe = /\bat\s+(.*)/;

function makeEvent(fields) {
  return {
    level: fields.kind,
    text: "",
    args: null,
    location: null,
    timestamp: new Date().toISOString(),
    ...fields,
  };
}

function parseFailOn(str) {
  return new Set(str.split(",").map((s) => s.trim()).filter(Boolean));
}

function shouldFail(event, failSet) {
  if (event.kind === "console" && failSet.has(event.level)) return true;
  if (event.kind === "pageerror" && failSet.has("pageerror")) return true;
  if (event.kind === "requestfailed" && failSet.has("requestfailed")) return true;
  if (event.kind === "httperror") {
    if (failSet.has("httperror")) return true;
    if (event.level === "4xx" && failSet.has("4xx")) return true;
    if (event.level === "5xx" && failSet.has("5xx")) return true;
  }
  if (event.kind === "eval") {
    if (event.level === "error" && failSet.has("eval-error")) return true;
    if (failSet.has("eval-falsy") && !event.evalResult) return true;
  }
  return false;
}

async function closeBrowser(browser) {
  try {
    await Promise.race([
      browser.close(),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  } catch {}
}

export async function capture({
  url,
  wait = 3000,
  cookies = [],
  login,
  formatter,
  waitUntil = "networkidle0",
  evals = [],
  failOn = "error,pageerror",
  timeout,
  maxEvents,
  filter,
  noSummary = false,
}) {
  const format = formatter || textFormatter();
  const failSet = parseFailOn(failOn);
  const startTime = Date.now();
  const filterRe = filter ? new RegExp(filter) : null;

  let hasFailed = false;
  const counts = { log: 0, error: 0, warning: 0, info: 0, debug: 0, pageerror: 0, requestfailed: 0, httperror: 0 };
  let totalRequests = 0;
  let firstError = null;
  const evalResults = [];
  const pending = [];
  let lastConsole = Promise.resolve();
  let browser;
  let eventCount = 0;
  let resolveWait;
  let capped = false;
  let timedOut = false;
  let timeoutId;

  function emit(event) {
    const isSummary = event.kind === "summary";
    const isFatal = event.kind === "fatal";

    if (shouldFail(event, failSet)) {
      hasFailed = true;
      if (!firstError) firstError = event;
    }

    if (isSummary && noSummary) return;
    if (!isSummary && !isFatal) {
      if (maxEvents != null && eventCount >= maxEvents) return;
      if (filterRe && !filterRe.test(event.text)) return;
    }

    const line = format(event);
    if (line != null) {
      console.log(line);
      if (!isSummary && !isFatal) {
        eventCount++;
        if (maxEvents != null && eventCount >= maxEvents) {
          capped = true;
          if (resolveWait) resolveWait();
        }
      }
    }
  }

  try {
    browser = await puppeteer.launch({ headless: true });

    if (timeout) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        hasFailed = true;
        emit(makeEvent({ kind: "fatal", text: `Timeout: exceeded ${timeout}ms` }));
        if (resolveWait) resolveWait();
        if (browser) closeBrowser(browser);
      }, timeout);
    }

    const page = await browser.newPage();

    if (cookies.length) await page.setCookie(...cookies);

    page.on("console", (msg) => {
      const type = msg.type();
      counts[type] = (counts[type] || 0) + 1;

      lastConsole = lastConsole.then(() =>
        Promise.all(
          msg.args().map((a) => a.jsonValue().catch(() => a.toString()))
        )
          .catch(() => null)
          .then((args) => {
            const loc = msg.location();
            const location =
              loc && loc.url
                ? { url: loc.url, line: loc.lineNumber, column: loc.columnNumber }
                : null;
            emit(
              makeEvent({
                kind: "console",
                level: type,
                text: msg.text(),
                args,
                location,
              })
            );
          })
      );
      pending.push(lastConsole);
    });

    page.on("pageerror", (err) => {
      counts.pageerror++;
      let location = null;
      if (err.stack) {
        const match = err.stack.match(stackLocationRe);
        if (match) location = { url: match[1].trim(), line: null, column: null };
      }
      emit(
        makeEvent({
          kind: "pageerror",
          text: err.message,
          location,
        })
      );
    });

    page.on("requestfailed", (req) => {
      counts.requestfailed++;
      emit(
        makeEvent({
          kind: "requestfailed",
          text: `${req.method()} ${req.url()} — ${req.failure().errorText}`,
        })
      );
    });

    page.on("request", () => {
      totalRequests++;
    });

    page.on("response", (res) => {
      const status = res.status();
      if (status >= 400) {
        const level = status < 500 ? "4xx" : "5xx";
        counts.httperror++;
        emit(
          makeEvent({
            kind: "httperror",
            level,
            text: `${res.request().method()} ${res.url()} — ${status}`,
          })
        );
      }
    });

    await page.goto(url, { waitUntil });
    if (login) {
      await performLogin(page, login, { waitUntil });
      if (login.postLoginUrl)
        await page.goto(login.postLoginUrl, { waitUntil });
    }
    if (!capped) {
      await new Promise((r) => {
        resolveWait = r;
        setTimeout(r, wait);
      });
    }

    // --eval expressions (skip if capped or timed out)
    if (!capped && !timedOut) {
      for (const expr of evals) {
        try {
          const result = await page.evaluate(expr);
          const text = String(result);
          evalResults.push({ expr, result, error: null });
          emit(
            makeEvent({
              kind: "eval",
              text,
              args: [result],
              expr,
              evalResult: result,
            })
          );
        } catch (err) {
          evalResults.push({ expr, result: null, error: err.message });
          emit(
            makeEvent({
              kind: "eval",
              level: "error",
              text: err.message,
              expr,
            })
          );
        }
      }
    }
  } catch (err) {
    if (!timedOut) {
      emit(
        makeEvent({
          kind: "fatal",
          text: err.message,
        })
      );
      hasFailed = true;
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    await Promise.allSettled(pending);
    if (browser) await closeBrowser(browser);

    const duration = Date.now() - startTime;
    const exitCode = hasFailed ? 1 : 0;

    emit(
      makeEvent({
        kind: "summary",
        counts,
        firstError,
        totalRequests,
        failedRequests: counts.requestfailed,
        httpErrors: counts.httperror,
        evalResults,
        exitCode,
        duration,
      })
    );
  }

  return hasFailed ? 1 : 0;
}
