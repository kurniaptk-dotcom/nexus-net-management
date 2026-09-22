import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

test.describe("Nexus Net Dashboard - Fungsional", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
  });

  test("1. Dashboard loads dengan benar", async ({ page }) => {
    await expect(page).toHaveTitle(/Nexus Net|Xnet|WiFi/);
    await expect(page.locator("text=Nexus Net Dashboard")).toBeVisible();
    await expect(page.locator("text=Total Pekerjaan")).toBeVisible();
    await expect(page.locator("text=Total Leads")).toBeVisible();
  });

  test("2. Sidebar navigasi ke semua halaman", async ({ page }) => {
    const routes = [
      { label: "Tim", heading: "Tim" },
      { label: "Pekerjaan", heading: "Pekerjaan" },
      { label: "Leads", heading: "Leads" },
      { label: "Gangguan", heading: "Gangguan" },
      { label: "ODP / ODC", heading: "ODP" },
      { label: "Laporan", heading: "Laporan" },
    ];

    for (const r of routes) {
      await page.click(`text=${r.label}`);
      await expect(page.locator(`h1:has-text("${r.heading}")`)).toBeVisible();
    }
  });

  test("3. Pekerjaan - Kanban board tampil", async ({ page }) => {
    await page.click("text=Pekerjaan");
    await expect(page.locator("span.font-bold.text-sm:text('Waiting List')")).toBeVisible();
    await expect(page.locator("span.font-bold.text-sm:text('Dijadwalkan')")).toBeVisible();
    await expect(page.locator("span.font-bold.text-sm:text('Selesai')")).toBeVisible();
  });

  test("4. Pekerjaan - Switch ke Table view", async ({ page }) => {
    await page.click("text=Pekerjaan");
    await page.click("button:has-text('Tabel')");
    await expect(page.locator("th:has-text('Pelanggan')")).toBeVisible();
  });

  test("5. Pekerjaan - Switch ke Calendar view", async ({ page }) => {
    await page.click("text=Pekerjaan");
    await page.click("button:has-text('Kalender')");
    await expect(page.getByRole("heading", { name: "September 2026" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hari Ini" })).toBeVisible();
  });

  test("6. Pekerjaan - Filter by Tim", async ({ page }) => {
    await page.click("text=Pekerjaan");
    await page.selectOption("select >> nth=1", "GATRA - AIS");
    await expect(page.locator("text=Ahmad Fauzi").first()).toBeVisible();
  });

  test("7. Pekerjaan - Tambah pekerjaan baru", async ({ page }) => {
    await page.click("text=Pekerjaan");
    await page.click("button:has-text('Tambah')");
    await expect(page.locator("h3:has-text('Tambah Pekerjaan Baru')")).toBeVisible();

    // Isi form — inputs diurutkan: tim(select), jenis(select), pelanggan, alamat, tanggal, status(select), keterangan
    const textInputs = page.locator("form input[type='text']");
    await textInputs.nth(0).fill("Test Pelanggan"); // Pelanggan
    await textInputs.nth(1).fill("Jl. Test No. 1"); // Alamat
    await page.getByRole("button", { name: "Simpan" }).click();

    // Modal harus tertutup
    await expect(page.locator("h3:has-text('Tambah Pekerjaan Baru')")).not.toBeVisible();
  });

  test("8. Leads page tampil", async ({ page }) => {
    await page.click("text=Leads");
    await expect(page.locator("h1:has-text('Leads')")).toBeVisible();
    await expect(page.locator("text=Rina Marlina")).toBeVisible();
  });

  test("9. Gangguan page tampil", async ({ page }) => {
    await page.click("text=Gangguan");
    await expect(page.locator("h1:has-text('Gangguan')")).toBeVisible();
    await expect(page.getByRole("table").getByText("Kabel Putus")).toBeVisible();
  });

  test("10. Laporan page - Export buttons ada", async ({ page }) => {
    await page.click("text=Laporan");
    await expect(page.getByRole("button", { name: /Export Excel/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Summary CSV" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Full JSON" })).toBeVisible();
  });

  test("11. Notification panel buka dan tampil", async ({ page }) => {
    const bellBtn = page.locator("header").getByRole("button").filter({ has: page.locator("svg.lucide-bell") });
    await bellBtn.click();
    await expect(page.locator("h3:has-text('Notifikasi')")).toBeVisible();
    await expect(page.getByRole("button", { name: "Semua", exact: true })).toBeVisible();
  });

  test("12. Tim page tampil dengan data 3 tim", async ({ page }) => {
    await page.click("text=Tim");
    await expect(page.locator("h1:has-text('Tim')")).toBeVisible();
    await expect(page.locator("text=GATRA - AIS")).toBeVisible();
    await expect(page.locator("text=AZWAR - RIO")).toBeVisible();
    await expect(page.locator("text=IQBAL - JUSMAN")).toBeVisible();
  });

  test("13. Dashboard - Kinerja Progress tampil", async ({ page }) => {
    await expect(page.locator("h3:has-text('Kinerja Pemasangan')")).toBeVisible();
    await expect(page.locator("h3:has-text('Kinerja Pemutusan')")).toBeVisible();
  });

  test("14. Dashboard - Gangguan chart tampil", async ({ page }) => {
    await expect(page.locator("text=Gangguan Eksternal")).toBeVisible();
    await expect(page.locator("div:has(> div.rounded-full) >> text=Modem").first()).toBeVisible();
  });

  test("15. Pekerjaan - Search filter", async ({ page }) => {
    await page.click("text=Pekerjaan");
    await page.fill('input[placeholder*="Cari pelanggan"]', "Ahmad");
    await expect(page.locator("text=Ahmad Fauzi")).toBeVisible();
  });
});
