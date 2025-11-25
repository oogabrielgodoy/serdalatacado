require("dotenv").config();
let puppeteer = require("puppeteer");
let xlsx = require("xlsx");

let email = process.env.SERDAL_EMAIL;
let senha = process.env.SERDAL_SENHA;

let inputFile = "src/domains/serdal/products.xlsx";
let outputFile = "src/domains/serdal/results.xlsx";
let baseUrl = process.env.SERDAL_BASE_URL;

(async () => {
  //Abrir planilha e ler skus
  console.log("[robo] Abrindo planilha input e lendo SKUs...");
  const workbook = xlsx.readFile(inputFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const skus = data
    .slice(1) // Remove o cabeçalho
    .map((row) => row[0]) // Assume que o SKU está na primeira coluna (coluna A)
    .filter((sku) => !!sku); // Remove vazios

  //Abrir puppeteer
  console.log("[robo] Iniciando navegador...");
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox"],
    defaultViewport: null,
  });

  let page = await browser.newPage();
  let data_list = [];

  //Fazer login na Serdal
  console.log("[robo] Fazendo login...");
  await page.goto(`${baseUrl}/customer/account/login/`, {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#login_prelogin_email", { visible: true });
  await page.type("#login_prelogin_email", email);
  await page.click("#login_prelogin_button");

  await page.waitForSelector("#pass", { visible: true });
  await page.type("#pass", senha);
  await page.click("#send2");
  await page.waitForNavigation({ waitUntil: "networkidle2" });
  console.log("[robo] Sucesso no login...");

  // Buscar SKU na Serdal
  for (const sku of skus) {
    await page.goto(`${baseUrl}/catalogsearch/result/?q=${sku}`, {
      waitUntil: "networkidle2",
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const result = await page.evaluate((sku) => {
      const products = Array.from(document.querySelectorAll(".product-info"));

      for (const product of products) {
        const spanCodigo = product.querySelector("span");
        if (spanCodigo && spanCodigo.innerText.includes(sku)) {
          const title = product.querySelector("h2")?.innerText?.trim();
          const price = product.querySelector(".price")?.innerText?.trim();
          const url = product.querySelector("h2.product-name a")?.href;

          return {
            sku: sku,
            title: title,
            price: price,
            url: url,
            status: "Found",
          };
        }
      }

      return {
        sku,
        title: "",
        price: "",
        url: "",
        status: "Not Found",
      };
    }, sku);

    data_list.push(result);
    console.log("[robo] Processando... ", result);
  }

  //Encerrar puppeteer
  await browser.close();

  //Salvar resultado na planilha de output
  const worksheet_output = xlsx.utils.json_to_sheet(data_list);
  const workbook_output = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook_output, worksheet_output, "Resultados");
  xlsx.writeFile(workbook_output, outputFile);
})();
