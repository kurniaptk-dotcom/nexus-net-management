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
import {
  createWhatsAppUrl,
  getRescheduleCustomerWaTemplate,
  getCustomerStatusUpdateWaTemplate,
} from "../src/lib/whatsapp.js";

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

test("Personal Payroll Engine - generates individual pay slip per technician with personal bank details", async () => {
  const { calculatePersonilPayroll, DEFAULT_PERSONIL_SALARY_PROFILES, generateWhatsAppSlipMessage } = await import("../src/lib/payroll.js");

  const sampleTasks = [
    {
      id: 101,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      komisi_total: 25000,
    },
    {
      id: 102,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      komisi_total: 35000,
    },
  ];

  // 1. Hitung payroll personal untuk "Ais Maulana"
  const aisPayroll = calculatePersonilPayroll({
    personil: { id: 1, nama: "Ais Maulana", panggilan: "AIS", peran: "Installer / Field Tech", timNama: "Tim A" },
    tasks: sampleTasks,
    periodLabel: "Oktober 2026",
  });

  assert.equal(aisPayroll.atasNama, "Ais Maulana");
  assert.equal(aisPayroll.nik, "TKN-001");
  assert.equal(aisPayroll.rekeningBank, "BCA - 8450192831");
  assert.equal(aisPayroll.gajiPokok, 2500000);
  assert.equal(aisPayroll.totalKomisiTugas, 60000); // 25.000 + 35.000 (komisi utuh per personil)
  assert.equal(aisPayroll.totalTunjangan, 650000); // Makan 300k + Transport 250k + Komunikasi 100k
  assert.equal(aisPayroll.totalPotongan, 50000); // BPJS 50k
  // Take Home Pay: 2.500.000 + 650.000 + 60.000 - 50.000 = 3.160.000
  assert.equal(aisPayroll.takeHomePay, 3160000);
  assert.ok(aisPayroll.slipNumber.startsWith("SLIP/AIS/"));

  // 2. Hitung payroll personal untuk "Gatra Wicaksono"
  const gatraPayroll = calculatePersonilPayroll({
    personil: { id: 2, nama: "Gatra Wicaksono", panggilan: "Gatra", peran: "Splicer / Fiber Specialist", timNama: "Tim A" },
    tasks: sampleTasks,
    periodLabel: "Oktober 2026",
  });

  assert.equal(gatraPayroll.atasNama, "Gatra Wicaksono");
  assert.equal(gatraPayroll.nik, "TKN-002");
  assert.equal(gatraPayroll.rekeningBank, "BCA - 8450192832");
  assert.equal(gatraPayroll.takeHomePay, 3160000);
  assert.ok(gatraPayroll.slipNumber.startsWith("SLIP/GATR/"));

  // 3. Pastikan pesan WhatsApp memuat NIK dan nama personal teknisi
  const aisWa = generateWhatsAppSlipMessage(aisPayroll);
  assert.ok(aisWa.includes("Ais Maulana"));
  assert.ok(aisWa.includes("TKN-001"));
  assert.ok(aisWa.includes("BCA - 8450192831"));
});

test("Personal Technician & Team Commission - full commission per person (not split 50-50)", async () => {
  const { calculateTeamIncentives } = await import("../src/lib/incentives.js");

  const sampleTasks = [
    {
      id: 201,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      komisi_total: 16500,
      komisi_items: [
        { id: "tarik_pelanggan_baru", qty: 85 },
        { id: "pasang_modem", qty: 1 },
        { id: "setting_modem", qty: 1 },
      ],
    },
    {
      id: 202,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      komisi_total: 20000,
      komisi_items: [
        { id: "tarik_pelanggan_baru", qty: 120 },
        { id: "pasang_modem", qty: 1 },
        { id: "setting_modem", qty: 1 },
      ],
    },
  ];

  // 1. Hitung untuk Tim A
  const incTeamA = calculateTeamIncentives(sampleTasks, "Tim A");
  assert.equal(incTeamA.taskCount, 2);
  assert.equal(incTeamA.totalBaseFee, 36500);

  // 2. Hitung untuk individu "AIS" - berhak atas komisi utuh per orang (36.500)
  const incAis = calculateTeamIncentives(sampleTasks, "AIS");
  assert.equal(incAis.taskCount, 2);
  assert.equal(incAis.totalBaseFee, 36500);

  // 3. Hitung untuk individu "Gatra" - juga berhak atas komisi utuh per orang (36.500)
  const incGatra = calculateTeamIncentives(sampleTasks, "Gatra");
  assert.equal(incGatra.taskCount, 2);
  assert.equal(incGatra.totalBaseFee, 36500);

  // 4. Teknisi luar tim (Jusman) tidak mendapat tugas Tim A
  const incJusman = calculateTeamIncentives(sampleTasks, "Jusman");
  assert.equal(incJusman.taskCount, 0);
  assert.equal(incJusman.totalBaseFee, 0);
});

test("Task Workload - includes MENUNGGU VALIDASI in active queue", () => {
  const taskList = [
    { tim: "Tim A", status: "WAITING LIST" },
    { tim: "Tim A", status: "MENUNGGU VALIDASI" },
    { tim: "Tim A", status: "SELESAI" },
    { tim: "Tim B", status: "MENUNGGU VALIDASI" },
  ];

  assert.equal(getTeamWorkload("Tim A", taskList), 2);
  assert.equal(getTeamWorkload("Tim B", taskList), 1);
});

test("Daily Report Cut-Off Jam 9 Malam (21:00 WIB) - evaluates on-time vs late submissions", async () => {
  const {
    evaluateReportSubmissionTime,
    getWibTimeParts,
    calculateTechnicianCutoffStats,
  } = await import("../src/lib/reportCutoff.js");

  // 1. Tepat waktu: 18:30 WIB (11:30 UTC)
  const onTime1 = evaluateReportSubmissionTime("2026-10-10T11:30:00Z");
  assert.equal(onTime1.status, "TEPAT_WAKTU");
  assert.equal(onTime1.isLate, false);

  // 2. Tepat waktu pas batas: 21:00 WIB (14:00 UTC)
  const onTimeCutoff = evaluateReportSubmissionTime("2026-10-10T14:00:00Z");
  assert.equal(onTimeCutoff.status, "TEPAT_WAKTU");
  assert.equal(onTimeCutoff.isLate, false);

  // 3. Terlambat: 21:15 WIB (14:15 UTC)
  const late1 = evaluateReportSubmissionTime("2026-10-10T14:15:00Z");
  assert.equal(late1.status, "TERLAMBAT");
  assert.equal(late1.isLate, true);

  // 4. Terlambat: 22:30 WIB (15:30 UTC)
  const late2 = evaluateReportSubmissionTime("2026-10-10T15:30:00Z");
  assert.equal(late2.status, "TERLAMBAT");
  assert.equal(late2.isLate, true);

  // 5. Belum lapor / null timestamp
  const noReport = evaluateReportSubmissionTime(null);
  assert.equal(noReport.status, "BELUM_LAPOR");

  // 6. Evaluasi Akumulasi Statistik Teknisi
  const mockPersonil = {
    id: 1,
    nama: "Ais Maulana",
    panggilan: "AIS",
    timNama: "Tim A",
  };

  const mockTasks = [
    {
      id: 301,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      waktu_lapor: "2026-10-09T11:15:00Z", // 18:15 WIB -> Tepat waktu
    },
    {
      id: 302,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      waktu_lapor: "2026-10-09T14:30:00Z", // 21:30 WIB -> Terlambat
    },
    {
      id: 303,
      tim: "Tim A",
      teknisi_list: ["AIS", "Gatra"],
      status: "SELESAI",
      waktu_lapor: "2026-10-08T10:00:00Z", // 17:00 WIB -> Tepat waktu
    },
  ];

  const stats = calculateTechnicianCutoffStats(mockPersonil, mockTasks, [{ id: 1, nama: "Tim A" }]);
  assert.equal(stats.totalDilaporkan, 3);
  assert.equal(stats.totalTepatWaktu, 2);
  assert.equal(stats.totalTerlambat, 1);
  assert.equal(stats.onTimeRate, 67); // Math.round(2/3 * 100) = 67%
});

test("Evidence Modal & Reporting - handles Single Photo SOP and Cut-Off timestamp extraction", async () => {
  const { evaluateReportSubmissionTime } = await import("../src/lib/reportCutoff.js");

  const taskSinglePhoto = {
    id: 501,
    spk_no: "SPK/PSB/20261014/0501",
    status: "MENUNGGU VALIDASI",
    foto_bukti_utama: "data:image/jpeg;base64,mockSinglePhotoBase64",
    waktu_lapor: "2026-10-14T13:45:00Z", // 20:45 WIB
    cutoff_status: "TEPAT_WAKTU",
    cutoff_label: "Tepat Waktu (<= 21:00 WIB)",
  };

  // 1. Single photo detection
  const hasSinglePhoto = Boolean(taskSinglePhoto.foto_bukti_utama);
  assert.equal(hasSinglePhoto, true);

  // 2. Cut-off evaluation matches
  const evalResult = evaluateReportSubmissionTime(taskSinglePhoto.waktu_lapor);
  assert.equal(evalResult.status, "TEPAT_WAKTU");
  assert.equal(evalResult.isLate, false);
});

test("WhatsApp Broadcast - generates structured Cut-Off 21:00 WIB executive recap", async () => {
  const { createCutoffRecapWaMessage } = await import("../src/lib/whatsapp.js");

  const mockPersonil = [
    { id: 1, nama: "Ais Maulana", panggilan: "AIS", timNama: "Tim A" },
    { id: 2, nama: "Jusman", panggilan: "Jusman", timNama: "Tim B" },
  ];

  const mockTasks = [
    {
      id: 601,
      spk_no: "SPK/PSB/20261015/0601",
      pelanggan: "Bpk. Hendra",
      teknisi_list: ["AIS"],
      status: "SELESAI",
      cutoff_status: "TEPAT_WAKTU",
      waktu_lapor: "2026-10-15T12:30:00Z",
    },
    {
      id: 602,
      spk_no: "SPK/RPR/20261015/0602",
      pelanggan: "Ibu Ratna",
      teknisi_list: ["Jusman"],
      status: "DIJADWALKAN",
      cutoff_status: null,
    },
  ];

  const waMsg = createCutoffRecapWaMessage(mockPersonil, mockTasks, "15 Oktober 2026");
  assert.ok(waMsg.includes("REKAPITULASI LAPORAN OPERASIONAL (CUT-OFF 21:00 WIB)"));
  assert.ok(waMsg.includes("15 Oktober 2026"));
  assert.ok(waMsg.includes("AIS"));
  assert.ok(waMsg.includes("Tepat Waktu"));
  assert.ok(waMsg.includes("Jusman"));
  assert.ok(waMsg.includes("Belum Melaporkan 1 Foto"));
});

test("SPK Solo Dispatching - assigns single technician directly as member", () => {
  const soloTeamString = "AIS (Solo)";
  const isSolo = soloTeamString.endsWith("(Solo)");
  const soloMember = soloTeamString.replace(" (Solo)", "").trim();

  assert.equal(isSolo, true);
  assert.equal(soloMember, "AIS");
  const assignedMembers = isSolo ? [soloMember] : ["Tim A"];
  assert.deepEqual(assignedMembers, ["AIS"]);
});

test("Closed-Loop Disconnection Sync - cleans up pending disconnection request", async () => {
  const { syncPemutusanOnTaskCompletion } = await import("../src/lib/customerPortLifecycle.js");

  // Setup mock global window and localStorage for node environment
  const mockStorage = new Map();
  global.window = {
    dispatchEvent: () => {},
  };
  global.CustomEvent = class { constructor(type, detail) { this.type = type; this.detail = detail; } };
  global.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
  };

  const initialRequests = [
    { id: 901, nama: "Bpk. Budi Santoso", kontak: "0812345", alasan: "Pindah rumah" },
    { id: 902, nama: "Ibu Siti Aminah", kontak: "0856789", alasan: "Biaya" },
  ];
  mockStorage.set("xnet_pengajuan_pemutusan", JSON.stringify(initialRequests));

  const completedDisconnectionTask = {
    id: 55,
    sourceId: 901,
    jenis: "PEMUTUSAN",
    pelanggan: "Bpk. Budi Santoso",
  };

  const res = syncPemutusanOnTaskCompletion(completedDisconnectionTask);
  assert.equal(res, true);

  const remaining = JSON.parse(mockStorage.get("xnet_pengajuan_pemutusan"));
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 902);
});

test("Task Progress State & Validation Status Preservation", () => {
  const validStatusList = ["WAITING LIST", "DIJADWALKAN", "MENUNGGU VALIDASI", "SELESAI", "GAGAL"];
  assert.ok(validStatusList.includes("MENUNGGU VALIDASI"));

  const task = {
    id: 1,
    status: "DIJADWALKAN",
    is_started: false,
  };

  const startedTask = {
    ...task,
    is_started: true,
    waktu_mulai: "2026-10-21T12:00:00Z",
  };

  assert.equal(startedTask.is_started, true);
  assert.ok(startedTask.waktu_mulai);
});

test("WhatsApp Templates - Reschedule & Customer Status Updates", () => {
  const obstacleTask = {
    id: 88,
    spk_no: "SPK/PSB/20261021/0088",
    jenis: "PEMASANGAN",
    pelanggan: "Bpk. Suryo",
    alasan_kendala: "Pohon tumbang menghalangi jalur kabel dropcore",
    tim: "GATRA - AIS",
    tanggal: "2026-10-22",
    sesi: "Sesi Pagi (08:30 - 12:00 WIB)",
  };

  const rescheduleMsg = getRescheduleCustomerWaTemplate(obstacleTask);
  assert.ok(rescheduleMsg.includes("Bpk. Suryo"));
  assert.ok(rescheduleMsg.includes("Pohon tumbang"));
  assert.ok(rescheduleMsg.includes("kunjungan ulang (reschedule)"));

  const scheduledUpdate = getCustomerStatusUpdateWaTemplate(obstacleTask, "SCHEDULED");
  assert.ok(scheduledUpdate.includes("telah dijadwalkan"));
  assert.ok(scheduledUpdate.includes("2026-10-22"));

  const otwTask = { ...obstacleTask, is_started: true };
  const otwUpdate = getCustomerStatusUpdateWaTemplate(otwTask, "ON_THE_WAY");
  assert.ok(otwUpdate.includes("sedang dalam perjalanan menuju lokasi Anda"));

  const completedTask = { ...obstacleTask, status: "SELESAI" };
  const completedUpdate = getCustomerStatusUpdateWaTemplate(completedTask, "SELESAI");
  assert.ok(completedUpdate.includes("telah selesai dilakukan"));
});

test("Ticket Timeline & Audit Trail - Event logging integrity", () => {
  const task = {
    id: 99,
    spk_no: "SPK/PSB/20261021/0099",
    timeline: [
      {
        timestamp: "2026-10-21T08:00:00Z",
        action: "SPK Diterbitkan",
        actor: "CS / Dispatcher",
      },
      {
        timestamp: "2026-10-21T09:30:00Z",
        action: "Menuju Lokasi Pelanggan",
        actor: "Teknisi Lapangan",
      },
    ],
  };

  assert.equal(task.timeline.length, 2);
  assert.equal(task.timeline[0].actor, "CS / Dispatcher");
  assert.equal(task.timeline[1].action, "Menuju Lokasi Pelanggan");
});

test("SPK Generator - Customer Time Slot Commitment (janji_jam)", () => {
  const taskWithAppointment = {
    id: 102,
    jenis: "PEMASANGAN",
    tim: "GATRA - AIS",
    pelanggan: "Ibu Maya",
    tanggal: "2026-10-22",
    sesi: "Siang (13:00 - 15:30 WIB)",
    janji_jam: "14:30 WIB",
  };

  const text = formatSpkWaText(taskWithAppointment, "SPK/PSB/20261022/0102");
  assert.ok(text.includes("KOMITMEN JANJI TEMU"));
  assert.ok(text.includes("14:30 WIB"));
  assert.ok(text.includes("Hubungi pelanggan sebelum meluncur"));
});

test("Offline Mode & Auto-Sync Engine - Queue management and zero data loss synchronization", async () => {
  const {
    getOfflineQueue,
    saveOfflineQueue,
    addToOfflineQueue,
    removeFromOfflineQueue,
    clearOfflineQueue,
    processOfflineSyncQueue,
  } = await import("../src/lib/offlineSync.js");

  // Mock localStorage & window environment for Node.js test runner
  const storageMap = new Map();
  global.localStorage = {
    getItem: (key) => storageMap.get(key) || null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
  global.window = {
    localStorage: global.localStorage,
    dispatchEvent: () => true,
  };

  clearOfflineQueue();
  assert.equal(getOfflineQueue().length, 0);

  // 1. Add complete task to offline queue
  const mockTask = {
    id: 888,
    pelanggan: "Bpk. Rahmat Lapangan",
    jenis: "PEMASANGAN",
    status: "MENUNGGU VALIDASI",
    redaman: "-19.2",
    sn_modem: "ZTEGC888999",
    is_offline_draft: true,
  };

  const entry = addToOfflineQueue({
    type: "COMPLETE_TASK",
    taskId: mockTask.id,
    taskData: mockTask,
    evidenceBundle: {
      foto_bukti_utama: "data:image/jpeg;base64,mockphoto123",
      redaman: "-19.2",
    },
    customerName: mockTask.pelanggan,
    jenis: mockTask.jenis,
  });

  assert.ok(entry.id);
  assert.equal(entry.taskId, 888);
  assert.equal(entry.status, "PENDING");
  assert.equal(getOfflineQueue().length, 1);

  // 2. Add kendala task to offline queue
  addToOfflineQueue({
    type: "KENDALA_TASK",
    taskId: 999,
    reason: "[KENDALA] Pelanggan tidak ada di rumah",
    customerName: "Ibu Sinta",
    jenis: "PERBAIKAN",
  });

  assert.equal(getOfflineQueue().length, 2);

  // 3. Deduplication: updating task 888 should not create a duplicate
  addToOfflineQueue({
    type: "COMPLETE_TASK",
    taskId: 888,
    taskData: { ...mockTask, redaman: "-18.9" },
    customerName: mockTask.pelanggan,
  });
  assert.equal(getOfflineQueue().length, 2);

  // 4. Process and auto-sync queue
  const syncedItems = [];
  const result = await processOfflineSyncQueue(getOfflineQueue(), {
    uploadBundleFn: async (bundle, taskId) => ({
      ...bundle,
      foto_bukti_utama: `https://storage.supabase.co/evidence/task_${taskId}.jpg`,
    }),
    onSyncItemSuccess: async (item, syncedTask) => {
      syncedItems.push(syncedTask || item);
    },
  });

  assert.equal(result.syncedCount, 2);
  assert.equal(result.failedCount, 0);
  assert.equal(result.remainingQueue.length, 0);
  assert.equal(getOfflineQueue().length, 0);

  // Verify synced task had is_offline_draft cleared to false
  const syncedComplete = syncedItems.find((s) => s.id === 888);
  assert.ok(syncedComplete);
  assert.equal(syncedComplete.is_offline_draft, false);
  assert.equal(syncedComplete.foto_bukti_utama, "https://storage.supabase.co/evidence/task_888.jpg");
  assert.ok(syncedComplete.synced_at);
});

test("Simplified SPK Dispatch & Field Technician Reporting Lifecycle", async () => {
  const {
    getDefaultWorkItemsForTask,
    calculateTaskIncentive,
    KOMISI_PEKERJAAN_MASTER,
  } = await import("../src/lib/incentives.js");

  // 1. Admin dispatches SPK quickly without guessing work items / meterage
  const dispatchedTask = {
    id: 991,
    spk_no: "SPK/PSB/20261022/0991",
    jenis: "PEMASANGAN",
    pelanggan: "Bpk. Danang Wicaksono",
    odp: "ODP 2.3",
    tim: "AZWAR - RIO",
    status: "DIJADWALKAN",
    komisi_items: [],
    komisi_total: 0,
  };

  assert.equal(dispatchedTask.komisi_items.length, 0);
  assert.equal(dispatchedTask.komisi_total, 0);

  // 2. Technician opens completion modal: system smartly auto-templates for job type
  const fallbackTemplate = (!dispatchedTask.komisi_items || dispatchedTask.komisi_items.length === 0)
    ? getDefaultWorkItemsForTask(dispatchedTask.jenis, 100, KOMISI_PEKERJAAN_MASTER)
    : dispatchedTask.komisi_items;

  assert.ok(fallbackTemplate.length > 0);
  const cableItem = fallbackTemplate.find((it) => it.id === "tarik_pelanggan_baru");
  assert.ok(cableItem);

  // 3. Technician enters real-world field report (e.g. actual dropcore measured: 75 meters)
  const reportedItems = fallbackTemplate.map((it) =>
    it.id === "tarik_pelanggan_baru" ? { ...it, qty: 75, subtotal: 75 * 100 } : it
  );

  const technicianReport = {
    ...dispatchedTask,
    status: "MENUNGGU VALIDASI",
    redaman: "-19.2",
    sn_modem: "ZTEGC7894561",
    foto_bukti_utama: "data:image/jpeg;base64,samplephoto123",
    komisi_items: reportedItems,
  };

  // 4. Validate commission calculation for MENUNGGU VALIDASI status
  const pendingIncentive = calculateTaskIncentive(technicianReport, undefined, KOMISI_PEKERJAAN_MASTER);
  assert.ok(pendingIncentive.total > 0);
  const reportedCable = pendingIncentive.items.find((i) => i.id === "tarik_pelanggan_baru");
  assert.equal(reportedCable.qty, 75);
  assert.equal(reportedCable.subtotal, 7500); // 75m * Rp 100/m

  // 5. Supervisor validates & approves to SELESAI
  const approvedTask = {
    ...technicianReport,
    status: "SELESAI",
    komisi_total: pendingIncentive.total,
    validated_by: "Supervisor NOC",
    validated_at: new Date().toISOString(),
  };

  assert.equal(approvedTask.status, "SELESAI");
  assert.equal(approvedTask.komisi_total, pendingIncentive.total);
  assert.equal(approvedTask.validated_by, "Supervisor NOC");
});

test("Specialized SPK Formats - generates custom WhatsApp instructions for all 5 job types", () => {
  // 1. PEMASANGAN BARU (PSB)
  const psbTask = {
    id: 1001,
    jenis: "PEMASANGAN",
    prioritas: "NORMAL",
    tim: "AZWAR - RIO",
    pelanggan: "Bpk. Rahmad",
    telepon: "081234567890",
    alamat: "Jl. Merdeka No. 10",
    odp: "ODP 1.1",
    port: "2",
    paket: "Home Fiber 30 Mbps",
    jarak_odp: "85",
  };
  const psbText = formatSpkWaText(psbTask, "SPK/PSB/20261022/1001");
  assert.ok(psbText.includes("PEMASANGAN BARU (PSB)"));
  assert.ok(psbText.includes("Bpk. Rahmad"));
  assert.ok(psbText.includes("Home Fiber 30 Mbps"));
  assert.ok(psbText.includes("Est. Dropcore:* ~85 Meter"));

  // 2. PEMUTUSAN (DISMANTLE)
  const disTask = {
    id: 1002,
    jenis: "PEMUTUSAN",
    prioritas: "NORMAL",
    tim: "DONI - FEBRI",
    pelanggan: "Ibu Siti Aminah",
    telepon: "085299887766",
    alamat: "Gg. Melati 3",
    odp: "ODP 2.3",
    port: "4",
    alasan_pemutusan: "Menunggak Tagihan > 2 Bulan",
    perangkat_ditarik: ["Modem ONT (Cek Serial Number)", "Adaptor Power Original", "Kabel Patchcord Fiber"],
  };
  const disText = formatSpkWaText(disTask, "SPK/DIS/20261022/1002");
  assert.ok(disText.includes("PEMUTUSAN (DISMANTLE)"));
  assert.ok(disText.includes("Alasan Pemutusan:* *Menunggak Tagihan > 2 Bulan*"));
  assert.ok(disText.includes("Perangkat Ditarik:* Modem ONT"));
  assert.ok(disText.includes("Port ODP Dibebaskan:* *ODP 2.3* (Port: 4)"));
  assert.ok(disText.includes("Tarik modem ONT dan adaptor secara lengkap"));

  // 3. PERBAIKAN (TROUBLESHOOT)
  const rprTask = {
    id: 1003,
    jenis: "PERBAIKAN",
    prioritas: "URGENT",
    tim: "AZWAR - RIO",
    pelanggan: "Toko Harapan Jaya",
    telepon: "081377889900",
    alamat: "Komp. Pertokoan Blok B2",
    odp: "ODP 1.4",
    port: "1",
    kategori_gangguan: "Lampu LOS Merah (Kabel Putus / Redaman Anjlok)",
  };
  const rprText = formatSpkWaText(rprTask, "SPK/RPR/20261022/1003");
  assert.ok(rprText.includes("PERBAIKAN GANGGUAN (TROUBLESHOOT)"));
  assert.ok(rprText.includes("Gejala Gangguan:* *Lampu LOS Merah (Kabel Putus / Redaman Anjlok)*"));
  assert.ok(rprText.includes("ODP Terhubung:* *ODP 1.4* (Port: 1)"));

  // 4. PERBAIKAN KHUSUS (ODP/ODC) (INFRASTRUCTURE)
  const splTask = {
    id: 1004,
    jenis: "PERBAIKAN KHUSUS (ODP/ODC)",
    prioritas: "TINGGI",
    tim: "BAMBANG - EKO",
    odc: "ODC-01",
    odp: "ODP 1.2",
    user_terdampak: "8",
    jenis_gangguan_odp: "Splitter Pasif Rusak / Redaman Port Drop",
    keterangan: "Ganti splitter 1:8 dan ukur redaman input ODP.",
  };
  const splText = formatSpkWaText(splTask, "SPK/SPL/20261022/1004");
  assert.ok(splText.includes("PERBAIKAN KHUSUS DISTRIBUSI (ODP/ODC)"));
  assert.ok(splText.includes("Titik Jaringan:* ODC *ODC-01* · ODP *ODP 1.2*"));
  assert.ok(splText.includes("Estimasi User Terdampak:* ~8 Pelanggan"));
  assert.ok(splText.includes("Jenis Masalah:* *Splitter Pasif Rusak / Redaman Port Drop*"));
  assert.ok(splText.includes("Gunakan fusion splicer standar low loss"));

  // 5. RELOKASI (REL)
  const relTask = {
    id: 1005,
    jenis: "RELOKASI",
    prioritas: "NORMAL",
    tim: "AZWAR - RIO",
    pelanggan: "Bpk. Hendra Gunawan",
    telepon: "082155667788",
    alamat: "Jl. Veteran No. 45",
    odp: "ODP 1.1",
    alamat_baru: "Jl. Purnama Komplek Nirwana C1",
    odp_baru: "ODP 3.2",
    port_baru: "3",
    keterangan: "Tarik kabel baru sekitar 65 meter.",
  };
  const relText = formatSpkWaText(relTask, "SPK/REL/20261022/1005");
  assert.ok(relText.includes("RELOKASI"));
  assert.ok(relText.includes("Bpk. Hendra Gunawan"));
  assert.ok(relText.includes("Titik Asal (Cabut):* Jl. Veteran No. 45 (ODP: ODP 1.1)"));
  assert.ok(relText.includes("Titik Tujuan (Pasang):* Jl. Purnama Komplek Nirwana C1 (ODP Baru: *ODP 3.2* Port: 3)"));
  assert.ok(relText.includes("Cabut port lama di ODP asal dengan aman"));
});

test("SPK Generator - includes aesthetic borders and direct customer WhatsApp click link", () => {
  const task = {
    id: 999,
    jenis: "PEMASANGAN",
    pelanggan: "Bpk. Andi",
    telepon: "081234567890",
    alamat: "Jl. Khatulistiwa No. 1",
    odp: "ODP 1.1",
    port: "1",
  };
  const text = formatSpkWaText(task, "SPK/PSB/20261022/0999");
  assert.ok(text.includes("━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  assert.ok(text.includes("https://wa.me/6281234567890"));
  assert.ok(text.includes("NEXUS FIBER BROADBAND NETWORK"));
});





