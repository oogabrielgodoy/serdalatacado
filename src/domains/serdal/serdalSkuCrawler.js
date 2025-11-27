require("dotenv").config();
let SerdalLogin = require("./SerdalLogin.js");
let SerdalSearchSku = require("./SerdalSearchSku.js");

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
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: null,
  });

  let page = await browser.newPage();

  //Fazer login na Serdal
  console.log("[robo] Fazendo login...");
  const login = await SerdalLogin(
    baseUrl,
    `/customer/account/login/`,
    page,
    email,
    senha
  );
  console.log(login);

  // Buscar SKU na Serdal
  console.log("[robo] Buscando skus...");
  for (const sku of skus) {
    const search = await SerdalSearchSku(
      baseUrl,
      `/catalogsearch/result/?q=`,
      sku,
      page
    );

    console.log(search);
  }

  //Encerrar puppeteer
  await browser.close();
})();
