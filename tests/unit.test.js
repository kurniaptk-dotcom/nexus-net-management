import test from "node:test";
import assert from "node:assert/strict";

import {
  generateSpkNumber,
  formatSpkWaText,
  getTeamWorkload,
  TASK_TYPES,
  formatPhoneWa,
} from "../src/lib/spkGenerator.js";

import {
  normalizeOdpName,
  parseTotalPort,
  enrichOdpWithPortUtilization,
  calculateNetworkPortStats,
} from "../src/lib/odpUtilization.js";

import {
  extractPortNumber,
  getOdpPortMap,
  checkPortCollision,
} from "../src/lib/portCollision.js";

import { syncCustomerOnTaskCompletion } from "../src/lib/customerPortLifecycle.js";

test("SPK Generator - generates standardized SPK format", () => {
  const spkPsb = generateSpkNumber("PEMASANGAN", 1234);
  assert.match(spkPsb, /^SPK\/PSB\/\d{8}\/1234$/);

  const spkDis = generateSpkNumber("PEMUTUSAN", 9876);
  assert.match(spkDis, /^SPK\/DIS\/\d{8}\/9876$/);

  const spkRpr = generateSpkNumber("PERBAIKAN", 4567);
  assert.match(spkRpr, /^SPK\/RPR\/\d{8}\/4567$/);
});

test("SPK Generator - formats WhatsApp work order text", () => {
  const task = {
    id: 101,
    jenis: "PEMASANGAN",
    prioritas: "URGENT",
    tim: "AZWAR - RIO",
    tanggal: "2026-10-01",
    sesi: "Pagi (08:30 - 12:00 WIB)",
    pelanggan: "Bpk. Hendra",
    telepon: "081234567890",
    alamat: "Jl. Gajah Mada No. 12",
    odp: "ODP 1.1",
    port: "3",
    keterangan: "Bawa kabel 100m",
  };
  const text = formatSpkWaText(task, "SPK/PSB/20261001/0101");
  assert.ok(text.includes("SPK/PSB/20261001/0101"));
  assert.ok(text.includes("PEMASANGAN BARU (PSB)"));
  assert.ok(text.includes("Bpk. Hendra"));
  assert.ok(text.includes("ODP 1.1"));
  assert.ok(text.includes("Port: 3"));
});

test("SPK Generator - team workload calculation", () => {
  const taskList = [
    { tim: "AZWAR - RIO", status: "WAITING LIST" },
    { tim: "AZWAR - RIO", status: "DIJADWALKAN" },
    { tim: "AZWAR - RIO", status: "SELESAI" },
    { tim: "BAMBANG - EKO", status: "WAITING LIST" },
  ];
  assert.equal(getTeamWorkload("AZWAR - RIO", taskList), 2);
  assert.equal(getTeamWorkload("BAMBANG - EKO", taskList), 1);
  assert.equal(getTeamWorkload("DONI - FEBRI", taskList), 0);
});

test("Port Utilization - normalizes ODP names and computes capacities", () => {
  assert.equal(normalizeOdpName("ODP 1.1"), "ODP11");
  assert.equal(normalizeOdpName("odp-01.1"), "ODP011");
  assert.equal(parseTotalPort("8 Port"), 8);
  assert.equal(parseTotalPort("16"), 16);
  assert.equal(parseTotalPort(null), 8);

  const mockOdps = [
    { nama: "ODP 1.1", kapasitas: 8 },
    { nama: "ODP 1.2", kapasitas: 2 },
  ];
  const mockCustomers = [
    { nama: "Cust 1", odp: "ODP 1.1", status: "AKTIF" },
    { nama: "Cust 2", odp: "ODP 1.2", status: "AKTIF" },
    { nama: "Cust 3", odp: "ODP 1.2", status: "AKTIF" },
    { nama: "Cust 4", odp: "ODP 1.2", status: "PUTUS" }, // status PUTUS tidak memakan port
  ];

  const enriched = enrichOdpWithPortUtilization(mockOdps, mockCustomers);
  const odp1 = enriched.find((o) => o.nama === "ODP 1.1");
  const odp2 = enriched.find((o) => o.nama === "ODP 1.2");

  assert.equal(odp1.port_terpakai, 1);
  assert.equal(odp1.port_sisa, 7);
  assert.equal(odp1.port_is_full, false);

  assert.equal(odp2.port_terpakai, 2);
  assert.equal(odp2.port_sisa, 0);
  assert.equal(odp2.port_is_full, true);

  const networkStats = calculateNetworkPortStats(enriched);
  assert.equal(networkStats.totalKapasitas, 10);
  assert.equal(networkStats.totalTerpakai, 3);
  assert.equal(networkStats.odpPenuhCount, 1);
});

test("Port Collision - detects occupied vs free ports", () => {
  assert.equal(extractPortNumber("ODP 1.1 Port 3"), 3);
  assert.equal(extractPortNumber("Port 5"), 5);

  const mockOdps = [{ nama: "ODP 1.1", kapasitas: 4 }];
  const mockCustomers = [
    { nama: "Ali", odp: "ODP 1.1 Port 2", status: "AKTIF" },
  ];

  const collision1 = checkPortCollision("ODP 1.1", 2, mockOdps, mockCustomers);
  assert.equal(collision1.isConflict, true);
  assert.equal(collision1.conflictingCustomer, "Ali");

  const collision2 = checkPortCollision("ODP 1.1", 3, mockOdps, mockCustomers);
  assert.equal(collision2.isConflict, false);
});

test("Customer & Port Lifecycle - activation and disconnection sync", () => {
  let customers = [
    { id: 1, nama: "Budi", odp: "ODP 1.1", status: "BARU" },
    { id: 2, nama: "Joko", odp: "ODP 1.1", status: "AKTIF" },
  ];
  const setCustomers = (newVal) => {
    customers = newVal;
  };

  // 1. Selesai Pemasangan -> Status jadi AKTIF
  const taskPasang = { jenis: "PEMASANGAN", pelanggan: "Budi", odp: "ODP 1.1" };
  const resPasang = syncCustomerOnTaskCompletion(taskPasang, customers, setCustomers);
  assert.equal(resPasang.type, "ACTIVATED");
  assert.equal(customers.find((c) => c.nama === "Budi").status, "AKTIF");

  // 2. Selesai Pemutusan -> Status jadi PUTUS (membebaskan port)
  const taskPutus = { jenis: "PEMUTUSAN", pelanggan: "Joko", odp: "ODP 1.1" };
  const resPutus = syncCustomerOnTaskCompletion(taskPutus, customers, setCustomers);
  assert.equal(resPutus.type, "DISCONNECTED");
  assert.equal(customers.find((c) => c.nama === "Joko").status, "PUTUS");
});

test("Payroll Engine - calculates Take Home Pay with base salary, allowances, tasks commission and deductions", async () => {
  const { calculateTeamPayroll, terbilangRupiah, generateWhatsAppSlipMessage } = await import("../src/lib/payroll.js");

  const sampleTasks = [
    {
      id: 1,
      tim: "GATRA - AIS",
      status: "SELESAI",
      komisi_total: 25000,
    },
    {
      id: 2,
      tim: "GATRA - AIS",
      status: "SELESAI",
      komisi_total: 35000,
    },
  ];

  const profileTetap = {
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    tunjanganMakan: 300000,
    tunjanganTransport: 200000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 100000,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BCA - 12345678",
    atasNama: "Gatra",
    nomorWa: "081234567890",
  };

  const payroll = calculateTeamPayroll({
    timNama: "GATRA - AIS",
    tasks: sampleTasks,
    profile: profileTetap,
    periodLabel: "Oktober 2026",
  });

  // Komisi tugas = 25.000 + 35.000 = 60.000
  assert.equal(payroll.totalKomisiTugas, 60000);
  assert.equal(payroll.totalTugasSelesai, 2);
  assert.equal(payroll.gajiPokok, 2500000);
  assert.equal(payroll.totalTunjangan, 600000);
  assert.equal(payroll.totalPotongan, 150000);

  // Take Home Pay = 2.500.000 + 600.000 + 60.000 - 150.000 = 3.010.000
  assert.equal(payroll.takeHomePay, 3010000);

  // Terbilang
  const terbilang = terbilangRupiah(payroll.takeHomePay);
  assert.ok(terbilang.includes("Juta"));
  assert.ok(terbilang.includes("Rupiah"));

  // Format WhatsApp message
  const waMsg = generateWhatsAppSlipMessage(payroll);
  assert.ok(waMsg.includes("SLIP GAJI & KOMISI RESMI NEXUS NET"));
  assert.ok(waMsg.includes("3.010.000"));
});

test("Billing Tax Engine - calculates DPP, PPN 11%, BHP 0.5%, USO 1.25% in Exclude and Include modes", async () => {
  const { calculateInvoiceBreakdown, formatRupiah, generateInvoiceNumber } = await import("../src/lib/billingTax.js");

  // Mode Exclude (Pajak ditambahkan di atas harga paket 200.000)
  const excludeBreakdown = calculateInvoiceBreakdown(200000, { includePajak: false });
  assert.equal(excludeBreakdown.dpp, 200000);
  assert.equal(excludeBreakdown.ppn, 22000); // 11% dari 200.000
  assert.equal(excludeBreakdown.bhp, 1000);  // 0.5% dari 200.000
  assert.equal(excludeBreakdown.uso, 2500);  // 1.25% dari 200.000
  assert.equal(excludeBreakdown.total, 225500); // 200.000 + 22.000 + 1.000 + 2.500

  // Mode Include (Harga 225.500 sudah termasuk pajak)
  const includeBreakdown = calculateInvoiceBreakdown(225500, { includePajak: true });
  assert.equal(includeBreakdown.total, 225500);
  assert.ok(includeBreakdown.dpp <= 200000);

  // Format Rupiah & Invoice Number
  assert.ok(formatRupiah(225500).includes("225.500"));
  const invNo = generateInvoiceNumber(15, new Date(2026, 9, 1));
  assert.equal(invNo, "INV/202610/0015");
});

test("Billing WhatsApp - generates proper pre-filled WhatsApp billing and unisolir URLs", async () => {
  const {
    generateWaInvoiceNotice,
    generateWaDueDateNotice,
    generateWaIsolirNotice,
    generateWaPaidReceipt,
  } = await import("../src/lib/whatsappBilling.js");

  const sampleInvoice = {
    nomor_invoice: "INV/202610/0001",
    id_pelanggan: "NX-2026-004",
    pelanggan: "Toko Sinar Rejeki",
    telepon: "085244332211",
    paket: "Dedicated Fiber 100 Mbps",
    periode: "Oktober 2026",
    total: 850000,
    jatuh_tempo: "2026-10-05",
    tanggal_bayar: "2026-10-06 10:00:00",
  };

  const invUrl = generateWaInvoiceNotice(sampleInvoice);
  assert.ok(invUrl.includes("wa.me/6285244332211"));
  assert.ok(invUrl.includes("INV%2F202610%2F0001"));

  const dueUrl = generateWaDueDateNotice(sampleInvoice);
  assert.ok(dueUrl.includes("wa.me/6285244332211"));
  assert.ok(dueUrl.includes("JATUH%20TEMPO"));

  const isolirUrl = generateWaIsolirNotice(sampleInvoice);
  assert.ok(isolirUrl.includes("ISOLASI%20LAYANAN"));

  const paidUrl = generateWaPaidReceipt(sampleInvoice);
  assert.ok(paidUrl.includes("BUKTI%20PEMBAYARAN%20LUNAS"));
});

