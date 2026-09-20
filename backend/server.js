require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const STORE = "https://demo.inelabteamdev.com";

/* =====================================================
   SCRAPER
===================================================== */

async function scrapeProduct(url, headed = false) {
  const browser = await chromium.launch({
    headless: !headed,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36"
  });

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    await page.waitForLoadState("networkidle").catch(() => {});

    // wait for async content
    await page.waitForTimeout(2000);

    // Click Reveal Price if present
    const reveal = page.getByRole("button", {
      name: /reveal price/i
    });

    if (await reveal.count()) {
      await reveal.first().click().catch(() => {});
      await page.waitForTimeout(2500);
    }

    const data = await page.evaluate(() => {
      const text = document.body.innerText;

      const match = text.match(/₹\s*([\d,]+(?:\.\d+)?)/);

      const price = match
        ? Number(match[1].replace(/,/g, ""))
        : null;

      const lower = text.toLowerCase();

      const stock =
        lower.includes("out of stock") ||
        lower.includes("sold out") ||
        lower.includes("unavailable")
          ? "OUT OF STOCK"
          : "IN STOCK";

      return { price, stock };
    });

    if (!data.price) throw new Error("Price could not be extracted.");

    return data;
  } finally {
    await browser.close();
  }
}

/* =====================================================
   RETRY WRAPPER
===================================================== */

async function scrapeWithRetry(url, headed = false) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await scrapeProduct(url, headed);
    } catch (err) {
      lastError = err;

      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw lastError;
}

/* =====================================================
   SEARCH PRODUCTS
===================================================== */

app.get("/api/search", async (req, res) => {
  const query = req.query.q;

  if (!query)
    return res.json([]);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  try {
    await page.goto(
      `${STORE}/?s=${encodeURIComponent(query)}`,
      {
        waitUntil: "networkidle",
        timeout: 30000
      }
    );

    const products = await page.evaluate(() => {
      const items = [];

      document.querySelectorAll("a").forEach((a) => {
        const href = a.href;
        const name = a.innerText.trim();

        if (
          href.includes("/product/") &&
          name.length > 3
        ) {
          items.push({
            name,
            url: href
          });
        }
      });

      const unique = [];
      const seen = new Set();

      for (const p of items) {
        if (!seen.has(p.url)) {
          seen.add(p.url);
          unique.push(p);
        }
      }

      return unique;
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  } finally {
    await browser.close();
  }
});

/* =====================================================
   ADD PRODUCT
===================================================== */

app.post("/api/products", async (req, res) => {
  const { name, url } = req.body;

  if (!name || !url)
    return res.status(400).json({
      error: "Name and URL required"
    });

  const { data, error } = await supabase
    .from("products")
    .insert([{ name, url }])
    .select();

  if (error)
    return res.status(500).json({
      error: error.message
    });

  res.json(data[0]);
});

/* =====================================================
   DASHBOARD
===================================================== */

app.get("/api/dashboard", async (req, res) => {
  const [products, history, logs] =
    await Promise.all([
      supabase.from("products").select("*"),
      supabase
        .from("price_history")
        .select("*")
        .order("scraped_at", {
          ascending: true
        }),
      supabase
        .from("scrape_logs")
        .select("*")
        .order("attempted_at", {
          ascending: false
        })
    ]);

  res.json({
    products: products.data || [],
    history: history.data || [],
    logs: logs.data || []
  });
});

/* =====================================================
   MANUAL SCRAPE (Demo Button)
===================================================== */

app.post("/api/scrape/:id", async (req, res) => {
  const { id } = req.params;
  const headed = req.query.headed === "true";

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product)
    return res.status(404).json({
      error: "Product not found"
    });

  try {
    const result = await scrapeWithRetry(
      product.url,
      headed
    );

    await supabase.from("price_history").insert({
      product_id: id,
      price: result.price,
      stock_status: result.stock
    });

    await supabase.from("scrape_logs").insert({
      product_id: id,
      status: "SUCCESS"
    });

    res.json(result);
  } catch (err) {
    await supabase.from("scrape_logs").insert({
      product_id: id,
      status: "FAILED",
      error_message: err.message
    });

    res.status(500).json({
      error: err.message
    });
  }
});

/* =====================================================
   CRON SCRAPER
===================================================== */

app.get("/api/cron", async (req, res) => {
  res.send("Cron started");

  const { data: products } = await supabase
    .from("products")
    .select("*");

  if (!products) return;

  for (const product of products) {
    try {
      const result = await scrapeWithRetry(
        product.url
      );

      await supabase.from("price_history").insert({
        product_id: product.id,
        price: result.price,
        stock_status: result.stock
      });

      await supabase.from("scrape_logs").insert({
        product_id: product.id,
        status: "SUCCESS"
      });

      console.log(
        `✓ ${product.name} : ₹${result.price}`
      );
    } catch (err) {
      await supabase.from("scrape_logs").insert({
        product_id: product.id,
        status: "FAILED",
        error_message: err.message
      });

      console.log(
        `✗ ${product.name} : ${err.message}`
      );
    }
  }
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/", (req, res) => {
  res.send("INE Price Tracker Backend Running");
});

/* =====================================================
   START SERVER
===================================================== */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});