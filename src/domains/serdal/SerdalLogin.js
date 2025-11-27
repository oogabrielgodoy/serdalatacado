async function SerdalLogin(baseUrl, endpoint, page, email, senha) {
  await page.goto(`${baseUrl}${endpoint}`, {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#login_prelogin_email", { visible: true });
  await page.type("#login_prelogin_email", email);
  await page.click("#login_prelogin_button");

  await page.waitForSelector("#pass", { visible: true });
  await page.type("#pass", senha);
  await page.click("#send2");
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  return {
    status: true,
    content: "Login realizado",
  };
}

module.exports = SerdalLogin;
