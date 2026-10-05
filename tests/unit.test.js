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
