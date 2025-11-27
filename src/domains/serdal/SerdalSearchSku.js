async function SerdalSearchSku(baseUrl, endpoint, sku, page) {
  await page.goto(`${baseUrl}${endpoint}${sku}`, {
    waitUntil: "networkidle2",
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const result = await page.evaluate((sku) => {
    const products = Array.from(document.querySelectorAll(".product-info"));

    for (const product of products) {
      const spanCodigo = product.querySelector("span");
      if (spanCodigo && spanCodigo.innerText.includes(sku)) {
        return {
          status: true,
          context: `Produto ${sku} encontrado`,
          product: {
            sku: sku,
            title: product.querySelector("h2")?.innerText?.trim(),
            price: product.querySelector(".price")?.innerText?.trim(),
            url: product.querySelector("h2.product-name a")?.href,
          },
        };
      } else {
        return {
          status: false,
          context: `Produto ${sku} não encontrado`,
          product: {
            sku: sku,
            title: null,
            price: null,
            url: null,
          },
        };
      }
    }
  }, sku);

  return result;
}

module.exports = SerdalSearchSku;
