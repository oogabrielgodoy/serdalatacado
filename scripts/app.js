require("dotenv").config();
const puppeteer = require("puppeteer");
const xlsx = require("xlsx");

const email = process.env.SERDAL_EMAIL;
const senha = process.env.SERDAL_SENHA;

const inputFile = "scripts/products.xlsx";
const outputFile = "scripts/results.xlsx";

(async () => {
  const skus = readSkusFromExcel(inputFile);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  const resultados = [];

  try {
    await PageLogin(page);

    for (const sku of skus) {
      const response = await PageSearchSku(page, sku);

      if (response) {
        console.log(`✅ Produto encontrado: ${sku}`);
        console.log(JSON.stringify(response, null, 2));
        resultados.push({ sku, ...response });
      } else {
        console.log(`❌ Sku ${sku} não encontrado.`);
        resultados.push({ sku, title: "", price: "", url: "" });
      }
    }

    saveToExcel(resultados, outputFile);
    console.log(`✅ Resultados salvos em: ${outputFile}`);
  } catch (error) {
    console.error("❌ Erro:", error.message);
    await page.screenshot({ path: "erro.png", fullPage: true });
  } finally {
    await browser.close();
  }
})();

// -------- FUNÇÕES AUXILIARES --------

function readSkusFromExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  return data
    .slice(1) // Remove o cabeçalho
    .map((row) => row[0]) // Assume que o SKU está na primeira coluna (coluna A)
    .filter((sku) => !!sku); // Remove vazios
}

function saveToExcel(data, filePath) {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Resultados");
  xlsx.writeFile(workbook, filePath);
}

async function PageLogin(page) {
  console.log("[robo] Acessando Serdal");
  const url = "https://www.serdalatacado.com.br/customer/account/login/";
  await page.goto(url, { waitUntil: "networkidle2" });

  await page.waitForSelector("#login_prelogin_email", { visible: true });
  await page.type("#login_prelogin_email", email);
  await page.click("#login_prelogin_button");

  await page.waitForSelector("#pass", { visible: true });
  await page.type("#pass", senha);
  await page.click("#send2");
  await page.waitForNavigation({ waitUntil: "networkidle2" });
  console.log("[login] Feito login");
}

async function PageSearchSku(page, sku) {
  const url = `https://www.serdalatacado.com.br/catalogsearch/result/?q=${sku}`;

  await page.goto(url, { waitUntil: "networkidle2" });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return await page.evaluate((sku) => {
    const products = Array.from(document.querySelectorAll(".product-info"));

    for (const product of products) {
      const spanCodigo = product.querySelector("span");
      if (spanCodigo && spanCodigo.innerText.includes(sku)) {
        const title = product.querySelector("h2")?.innerText?.trim() || "";
        const price = product.querySelector(".price")?.innerText?.trim() || "";
        const url = product.querySelector("h2.product-name a")?.href || "";
        return { title, price, url };
      }
    }
    return null;
  }, sku);
}
