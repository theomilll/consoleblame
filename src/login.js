export async function login(page, {
  username,
  password,
  usernameSelector = "#username",
  passwordSelector = "#password",
  submitSelector = 'button[type="submit"]',
}, { waitUntil = "networkidle0" } = {}) {
  await page.waitForSelector(usernameSelector, { timeout: 10000 });
  await page.type(usernameSelector, username);
  await page.type(passwordSelector, password);
  await page.click(submitSelector);
  await page.waitForNavigation({ waitUntil }).catch(() => {});
  await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
}
