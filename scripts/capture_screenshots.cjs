const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_DIR = path.resolve(__dirname, "../dist");
const SCREENSHOTS_DIR = path.resolve(__dirname, "../presentation/screenshots");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function startServer(port = 4173) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0];
      let filePath = path.join(DIST_DIR, reqPath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        // SPA Fallback
        filePath = path.join(DIST_DIR, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end("Internal Server Error");
        } else {
          res.writeHead(200, { "Content-Type": contentType });
          res.end(content);
        }
      });
    });

    server.listen(port, () => {
      console.log(`[SERVER] In-process static server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const server = await startServer(4173);
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log("[CAPTURE] 1. Login Page...");
    await page.goto("http://localhost:4173/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_login.png") });

    console.log("[CAPTURE] 2. Logging in as Admin...");
    await page.evaluate(() => {
      localStorage.setItem(
        "nexus_demo_session",
        JSON.stringify({
          user: { id: "demo-admin-id", email: "admin@nexus.net", user_metadata: { full_name: "Nexus Admin" } },
          profile: { id: "demo-admin-id", email: "admin@nexus.net", full_name: "Nexus Admin", role: "admin" },
        })
      );
    });

    console.log("[CAPTURE] 3. Dashboard...");
    await page.goto("http://localhost:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_dashboard.png") });

    console.log("[CAPTURE] 4. ODP & GIS Topologi Google Earth...");
    await page.goto("http://localhost:4173/odp", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03_odp_gis.png") });

    console.log("[CAPTURE] 5. Leads & Survey Feasibility...");
    await page.goto("http://localhost:4173/leads", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04_leads.png") });

    console.log("[CAPTURE] 6. Pekerjaan (Kanban Board)...");
    await page.goto("http://localhost:4173/pekerjaan", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05_pekerjaan_kanban.png") });

    console.log("[CAPTURE] 7. Pelanggan Radius (Mikrotik PPPoE Sync)...");
    await page.goto("http://localhost:4173/pelanggan", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06_pelanggan_radius.png") });

    console.log("[CAPTURE] 8. Laporan & Payroll Komisi...");
    await page.goto("http://localhost:4173/laporan", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07_laporan_komisi.png") });

    console.log("[CAPTURE] 9. Portal Teknisi Mobile View (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://localhost:4173/login", { waitUntil: "domcontentloaded" });
    await mobilePage.evaluate(() => {
      localStorage.setItem(
        "nexus_demo_session",
        JSON.stringify({
          user: { id: "demo-teknisi-id", email: "ais@nexus.net", user_metadata: { full_name: "Gatra (Ais)", tim: "GATRA - AIS" } },
          profile: { id: "demo-teknisi-id", email: "ais@nexus.net", full_name: "Gatra (Ais)", role: "teknisi", tim: "GATRA - AIS", allowed_menus: ["/teknisi"] },
        })
      );
    });
    await mobilePage.goto("http://localhost:4173/teknisi", { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(2500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, "08_teknisi_mobile.png") });
    await mobileContext.close();

    console.log("[SUCCESS] ALL SCREENSHOTS CAPTURED CLEANLY!");
  } catch (err) {
    console.error("[ERROR]", err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
}

main();
