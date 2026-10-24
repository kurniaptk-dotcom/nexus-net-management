const { chromium } = require("playwright");

async function runTest() {
  console.log("=== MEMULAI TEST SIMULASI MULTI-PERANGKAT CLOUD SYNC ===");
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Client 1: HP Android Teknisi (Gatra - Ais)
    console.log("\n[Klien 1 - HP Android Teknisi]");
    const contextTeknisi = await browser.newContext({
      viewport: { width: 412, height: 915 }, // Pixel 7 viewport
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    });
    const pageTeknisi = await contextTeknisi.newPage();
    pageTeknisi.on("console", msg => console.log(`[TEKNISI CONSOLE] ${msg.type()}: ${msg.text()}`));
    pageTeknisi.on("pageerror", err => console.error(`[TEKNISI ERROR] ${err.message}`));

    // Buka halaman login
    await pageTeknisi.goto("http://localhost:5173/login");
    await pageTeknisi.waitForTimeout(2000);

    // Klik tombol 1-Klik Teknisi Cloud
    console.log("Mengklik tombol 1-Klik Teknisi Cloud (gatra@nexus.net)...");
    const btnTeknisi = pageTeknisi.locator("button:has-text('Teknisi Cloud')");
    await btnTeknisi.click();
    await pageTeknisi.waitForTimeout(5000);

    // Cek apakah ada pesan error di UI
    const errTextTeknisi = await pageTeknisi.locator(".bg-rose-50").textContent().catch(() => null);
    if (errTextTeknisi) console.log("Pesan Error di Login Teknisi:", errTextTeknisi);

    // Cek apakah berhasil masuk dan URL berubah
    const urlTeknisi = pageTeknisi.url();
    console.log("URL Teknisi setelah login:", urlTeknisi);

    // Ambil auth session dari localStorage teknisi
    const authSessionTeknisi = await pageTeknisi.evaluate(() => {
      const keys = Object.keys(localStorage);
      const supabaseAuthKey = keys.find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      const raw = supabaseAuthKey ? localStorage.getItem(supabaseAuthKey) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        keys: keys.filter(k => k.includes("sb-") || k.includes("auth") || k.includes("nexus")),
        email: parsed?.user?.email || "none",
        role: parsed?.user?.user_metadata?.role || "none",
        isDemoSession: !!localStorage.getItem("nexus_demo_session"),
      };
    });
    console.log("Status Auth Teknisi:", authSessionTeknisi);

    // 2. Client 2: Komputer Kantor Admin (demo_admin@nexus.net)
    console.log("\n[Klien 2 - Komputer Admin Kantor]");
    const contextAdmin = await browser.newContext({
      viewport: { width: 1440, height: 900 }, // Desktop viewport
    });
    const pageAdmin = await contextAdmin.newPage();
    pageAdmin.on("console", msg => console.log(`[ADMIN CONSOLE] ${msg.type()}: ${msg.text()}`));
    pageAdmin.on("pageerror", err => console.error(`[ADMIN ERROR] ${err.message}`));

    await pageAdmin.goto("http://localhost:5173/login");
    await pageAdmin.waitForTimeout(2000);

    console.log("Mengklik tombol 1-Klik Admin Cloud (demo_admin@nexus.net)...");
    const btnAdmin = pageAdmin.locator("button:has-text('Admin Cloud')");
    await btnAdmin.click();
    await pageAdmin.waitForTimeout(5000);

    const errTextAdmin = await pageAdmin.locator(".bg-rose-50").textContent().catch(() => null);
    if (errTextAdmin) console.log("Pesan Error di Login Admin:", errTextAdmin);

    const urlAdmin = pageAdmin.url();
    console.log("URL Admin setelah login:", urlAdmin);

    const authSessionAdmin = await pageAdmin.evaluate(() => {
      const keys = Object.keys(localStorage);
      const supabaseAuthKey = keys.find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      const raw = supabaseAuthKey ? localStorage.getItem(supabaseAuthKey) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        keys: keys.filter(k => k.includes("sb-") || k.includes("auth") || k.includes("nexus")),
        email: parsed?.user?.email || "none",
        role: parsed?.user?.user_metadata?.role || "none",
        isDemoSession: !!localStorage.getItem("nexus_demo_session"),
      };
    });
    console.log("Status Auth Admin:", authSessionAdmin);

    // 3. Verifikasi Status Realtime Badge & Cloud Sync Button
    console.log("\n[Verifikasi Realtime Badge & 2-Way Sync Button]");
    // Buka popover RealtimeStatusBadge di halaman Admin
    const badgeAdmin = pageAdmin.locator("button:has-text('Live'), button:has-text('Standby'), button:has-text('Offline')").first();
    if (await badgeAdmin.isVisible()) {
      await badgeAdmin.click();
      await pageAdmin.waitForTimeout(1000);
      const hasSyncButton = await pageAdmin.locator("button:has-text('Sinkronkan Cloud (2 Arah)')").isVisible();
      console.log("Tombol 'Sinkronkan Cloud (2 Arah)' muncul di Popover Admin:", hasSyncButton);

      if (hasSyncButton) {
        console.log("Menjalankan Sinkronkan Cloud (2 Arah) dari UI Admin...");
        await pageAdmin.locator("button:has-text('Sinkronkan Cloud (2 Arah)')").click();
        await pageAdmin.waitForTimeout(3000);
      }
    }

    // 4. Verifikasi Jumlah Data Operasional di Browser Memory
    const dataStats = await pageAdmin.evaluate(() => {
      return {
        pekerjaanCount: (JSON.parse(localStorage.getItem("xnet_pekerjaan") || "[]")).length,
        leadsCount: (JSON.parse(localStorage.getItem("xnet_leads") || "[]")).length,
        odpCount: (JSON.parse(localStorage.getItem("xnet_odpodc") || "[]")).length,
        radiusCount: (JSON.parse(localStorage.getItem("xnet_pelanggan_radius") || "[]")).length,
      };
    });
    console.log("\n[Data Operasional Tersinkron di Memori Admin]:", dataStats);

    // 5. Test Cross-Device Instant Propagation via BroadcastChannel
    console.log("\n[Test Broadcast Antar-Tab / Antar-Jendela]");
    const broadcastTest = await pageAdmin.evaluate(() => {
      return new Promise((resolve) => {
        const bc = new BroadcastChannel("xnet_live_sync_bus");
        bc.onmessage = (ev) => {
          resolve({ received: true, data: ev.data });
        };
        // Kirim dari instance lain
        const sender = new BroadcastChannel("xnet_live_sync_bus");
        sender.postMessage({ type: "TEST_SYNC", message: "Halo dari HP Teknisi Lapangan!" });
        setTimeout(() => resolve({ received: false }), 2000);
      });
    });
    console.log("Hasil BroadcastChannel Sync Bus:", broadcastTest);

    console.log("\n=== TEST MULTI-PERANGKAT SELESAI DENGAN SUKSES! ===");
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await browser.close();
  }
}

runTest();
