import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  RotateCcw,
  ShieldAlert,
  Link as LinkIcon,
  HelpCircle,
  FileText,
  Users,
  Eye,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  Code2,
  Send,
  Radio
} from 'lucide-react';
import { Voter, Candidate } from '../types';
import { CANDIDATES_SPREADSHEET_TEMPLATE_CSV } from '../data/initialCandidates';
import { Watermark } from './Watermark';

interface PanitiaSpreadsheetProps {
  candidates: Candidate[];
  onCandidatesUpdated: () => void;
  onRefresh: () => void;
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ============================================================
 * GOOGLE APPS SCRIPT: E-VOTING OSIS SMKN 2 GORONTALO
 * Dikembangkan untuk: Pemilihan Ketua & Wakil Ketua OSIS
 * Watermark: kikybahsoan
 * ============================================================
 *
 * CARA PEMASANGAN DI GOOGLE SPREADSHEET:
 * 1. Buka spreadsheet baru di https://sheets.new
 * 2. Klik menu 'Ekstensi' > 'Apps Script'
 * 3. Hapus seluruh isi kode bawaan, tempelkan SELURUH kode di bawah ini.
 * 4. Klik ikon 'Simpan' (Ctrl+S atau Cmd+S).
 * 5. Klik tombol biru 'Terapkan' (Deploy) di kanan atas > 'Deployment baru' (New deployment).
 * 6. Klik ikon gerigi di kiri (Select type) > pilih 'Aplikasi Web' (Web app).
 * 7. Konfigurasi:
 *    - Deskripsi: E-Voting OSIS SMKN 2 Gorontalo
 *    - Jalankan sebagai (Execute as): Saya (akun Anda)
 *    - Siapa saja yang memiliki akses (Who has access): Siapa saja (Anyone) -> WAJIB!
 * 8. Klik 'Terapkan' (Deploy), berikan izin akses (Review Permissions > Akun Anda > Lanjutan/Advanced > Buka/Go to Project).
 * 9. Salin 'URL Aplikasi Web' (akhiran /exec) dan tempelkan ke form Aplikasi E-Voting!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "VOTE_RECORDED") {
      // 1. Catat ke sheet Log_Suara_Masuk
      var logSheet = sheet.getSheetByName("Log_Suara_Masuk");
      if (!logSheet) {
        logSheet = sheet.insertSheet("Log_Suara_Masuk");
        logSheet.appendRow(["Timestamp", "Kode Tiket", "NISN", "Nama Pemilih", "Rombel", "Pilihan Paslon", "Ketua & Wakil", "Watermark"]);
        logSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#1e1b4b").setFontColor("#ffffff");
      }
      logSheet.appendRow([
        data.timestamp,
        data.ballotCode,
        data.voter.nisn,
        data.voter.nama,
        data.voter.rombel,
        "PASLON 0" + data.candidate.nomorUrut,
        data.candidate.namaKetua + " & " + data.candidate.namaWakil,
        "kikybahsoan"
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "SUCCESS",
        message: "Suara berhasil dicatat ke Google Spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === "SYNC_ALL") {
      // 2. Sinkronisasi Penuh Hasil Suara & DPT 294 Siswa
      syncAllData(sheet, data);
      return ContentService.createTextOutput(JSON.stringify({
        status: "SUCCESS",
        message: "Seluruh data DPT dan hasil suara berhasil disinkronkan!"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === "PING") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "PONG",
        watermark: "kikybahsoan",
        time: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "OK" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ERROR",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllData(ss, data) {
  // Tab 1: Hasil_Suara
  var hasilSheet = ss.getSheetByName("Hasil_Suara") || ss.insertSheet("Hasil_Suara");
  hasilSheet.clear();
  hasilSheet.appendRow(["REKAPITULASI HASIL PEMILIHAN KETUA OSIS SMKN 2 GORONTALO"]);
  hasilSheet.appendRow(["Waktu Update: " + data.timestamp, "Watermark: kikybahsoan"]);
  hasilSheet.appendRow(["Total DPT: " + data.totalDpt, "Suara Masuk: " + data.totalVotes, "Partisipasi: " + data.turnoutPercentage + "%"]);
  hasilSheet.appendRow([""]);
  hasilSheet.appendRow(["Nomor Urut", "Nama Calon Ketua", "Nama Calon Wakil", "Rombel Asal", "Jumlah Suara", "Persentase"]);
  hasilSheet.getRange(5, 1, 1, 6).setFontWeight("bold").setBackground("#1e1b4b").setFontColor("#ffffff");

  if (data.candidates && data.candidates.length) {
    for (var i = 0; i < data.candidates.length; i++) {
      var c = data.candidates[i];
      hasilSheet.appendRow([c.nomorUrut, c.namaKetua, c.namaWakil, c.kelasKetua + " / " + c.kelasWakil, c.votes, c.percentage + "%"]);
    }
  }

  // Tab 2: Daftar_Hadir_DPT (294 Siswa)
  var dptSheet = ss.getSheetByName("Daftar_Hadir_DPT") || ss.insertSheet("Daftar_Hadir_DPT");
  dptSheet.clear();
  dptSheet.appendRow(["DAFTAR KEHADIRAN PEMILIH TETAP (DPT) SMKN 2 GORONTALO"]);
  dptSheet.appendRow(["Watermark: kikybahsoan", "Terakhir Diperbarui: " + data.timestamp]);
  dptSheet.appendRow([""]);
  dptSheet.appendRow(["No", "Nama Siswa", "Rombel", "NIPD", "NISN", "Status Kehadiran", "Waktu Memilih", "Kode Tiket Suara"]);
  dptSheet.getRange(4, 1, 1, 8).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");

  if (data.voters && data.voters.length) {
    for (var j = 0; j < data.voters.length; j++) {
      var v = data.voters[j];
      dptSheet.appendRow([v.no, v.nama, v.rombel, v.nipd, v.nisn, v.status, v.waktu, v.tiket]);
    }
  }
}
`;

export const PanitiaSpreadsheet: React.FC<PanitiaSpreadsheetProps> = ({
  candidates,
  onCandidatesUpdated,
  onRefresh,
}) => {
  // Tabs: 'appscript' | 'paslon_upload' | 'dpt_list' | 'google_sheet' | 'reset'
  const [activeSubTab, setActiveSubTab] = useState<'appscript' | 'paslon_upload' | 'dpt_list' | 'google_sheet' | 'reset'>('appscript');

  // Google Apps Script state
  const [appsScriptUrl, setAppsScriptUrl] = useState('https://script.google.com/macros/s/AKfycbw1GCnJlUTkrKJFObrxA6OKyiaQoFG6epF86M_nWGJE1a1KHMAzViwGuwST-QYRnWIP/exec');
  const [appsScriptLastSync, setAppsScriptLastSync] = useState('');
  const [savingAppsScript, setSavingAppsScript] = useState(false);
  const [syncingAllAppsScript, setSyncingAllAppsScript] = useState(false);
  const [appsScriptMessage, setAppsScriptMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Candidate upload state
  const [csvContent, setCsvContent] = useState('');
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Google Sheet Sync state
  const [sheetUrl, setSheetUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // DPT Voters state
  const [voters, setVoters] = useState<Voter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRombel, setFilterRombel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'voted' | 'not_voted'>('ALL');
  const [loadingVoters, setLoadingVoters] = useState(false);

  // Reset state
  const [resetPin, setResetPin] = useState('');
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Apps Script configuration
  useEffect(() => {
    fetch('/api/appscript/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.appsScriptUrl) {
          setAppsScriptUrl(data.appsScriptUrl);
        }
        if (data.appsScriptLastSync) {
          setAppsScriptLastSync(data.appsScriptLastSync);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch voters
  const fetchVoters = async () => {
    setLoadingVoters(true);
    try {
      let url = '/api/voters';
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterRombel !== 'ALL') params.append('rombel', filterRombel);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.voters) {
        setVoters(data.voters);
      }
    } catch {
      // Error handling
    }
    setLoadingVoters(false);
  };

  useEffect(() => {
    fetchVoters();
  }, [searchQuery, filterRombel, filterStatus]);

  // Save Apps Script URL
  const handleSaveAppsScriptUrl = async () => {
    if (!appsScriptUrl.trim()) {
      setAppsScriptMessage({ type: 'error', text: 'Masukkan Web App URL Google Apps Script.' });
      return;
    }

    setSavingAppsScript(true);
    setAppsScriptMessage(null);

    try {
      const res = await fetch('/api/appscript/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appsScriptUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppsScriptMessage({
          type: 'success',
          text: data.message || 'URL Google Apps Script berhasil dihubungkan!',
        });
      } else {
        setAppsScriptMessage({
          type: 'error',
          text: data.message || 'Gagal menyimpan URL Apps Script.',
        });
      }
    } catch {
      setAppsScriptMessage({ type: 'error', text: 'Gagal menghubungi server aplikasi.' });
    }
    setSavingAppsScript(false);
  };

  // Sync All Data to Google Spreadsheet via Apps Script
  const handleSyncAllAppsScript = async () => {
    if (!appsScriptUrl.trim()) {
      setAppsScriptMessage({ type: 'error', text: 'Simpan URL Apps Script terlebih dahulu!' });
      return;
    }

    setSyncingAllAppsScript(true);
    setAppsScriptMessage(null);

    try {
      const res = await fetch('/api/appscript/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setAppsScriptMessage({
          type: 'success',
          text: data.message || 'Semua 294 pemilih & rekap perolehan suara berhasil dikirim ke Google Spreadsheet!',
        });
        if (data.lastSync) setAppsScriptLastSync(data.lastSync);
      } else {
        setAppsScriptMessage({ type: 'error', text: data.message || 'Gagal sinkronisasi ke Apps Script.' });
      }
    } catch (err: any) {
      setAppsScriptMessage({ type: 'error', text: `Gangguan: ${err.message}` });
    }
    setSyncingAllAppsScript(false);
  };

  // Copy Apps Script code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Handle CSV file upload from local computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  // Submit candidate CSV
  const handleApplyCandidateCSV = async () => {
    if (!csvContent.trim()) {
      setUploadMessage({ type: 'error', text: 'Konten spreadsheet CSV belum diisi!' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const res = await fetch('/api/candidates/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadMessage({
          type: 'success',
          text: 'Data Paslon berhasil diperbarui dan langsung terpasang pada Bilik Suara!',
        });
        onCandidatesUpdated();
        onRefresh();
      } else {
        setUploadMessage({ type: 'error', text: data.message || 'Gagal memproses spreadsheet.' });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: 'Koneksi gagal saat mengunggah spreadsheet.' });
    }
    setUploading(false);
  };

  // Sync with Google Sheets Link (CSV Export Mode)
  const handleSyncGoogleSheet = async (type: 'candidates' | 'voters') => {
    if (!sheetUrl.trim()) {
      setSyncMessage({ type: 'error', text: 'Masukkan URL Google Spreadsheet yang valid.' });
      return;
    }

    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/sync-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim(), type }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncMessage({
          type: 'success',
          text: data.message || 'Sinkronisasi Google Sheets berhasil!',
        });
        onCandidatesUpdated();
        onRefresh();
        fetchVoters();
      } else {
        setSyncMessage({ type: 'error', text: data.message || 'Gagal sinkronisasi Google Sheets.' });
      }
    } catch {
      setSyncMessage({ type: 'error', text: 'Terjadi gangguan koneksi ke Google Sheets.' });
    }
    setSyncing(false);
  };

  // Reset Election
  const handleResetElection = async () => {
    if (!resetPin) {
      setResetMessage({ type: 'error', text: 'Masukkan PIN / Kata Sandi Panitia!' });
      return;
    }

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resetPin }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetMessage({ type: 'success', text: data.message });
        setResetPin('');
        onCandidatesUpdated();
        onRefresh();
        fetchVoters();
      } else {
        setResetMessage({ type: 'error', text: data.message || 'PIN Panitia salah! Gunakan sandi panitia.' });
      }
    } catch {
      setResetMessage({ type: 'error', text: 'Gagal mereset data.' });
    }
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const blob = new Blob([CANDIDATES_SPREADSHEET_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_paslon_osis_smkn2.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique rombels list
  const rombelOptions = [
    'ALL',
    '12-APHP-1',
    '12-APHP-2',
    '12-BUSANA',
    '12-CANTIK-1',
    '12-CANTIK-2',
    '12-DKV-1',
    '12-DKV-2',
    '12-HOTEL-1',
    '12-HOTEL-2',
    '12-HOTEL-3',
    '12-KULINER',
  ];

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-semibold">
              PANITIA PEMILIHAN OSIS
            </span>
            <Watermark variant="badge" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Manajemen Data & Integrasi Spreadsheet
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Simpan data ke Google Spreadsheet via Apps Script, perbarui paslon, dan pantau DPT 294 siswa.
          </p>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('appscript')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeSubTab === 'appscript'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Google Apps Script</span>
          </button>
          <button
            onClick={() => setActiveSubTab('paslon_upload')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'paslon_upload'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upload Paslon
          </button>
          <button
            onClick={() => setActiveSubTab('dpt_list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'dpt_list'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            DPT 294 Siswa
          </button>
          <button
            onClick={() => setActiveSubTab('google_sheet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'google_sheet'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Import Sheet CSV
          </button>
          <button
            onClick={() => setActiveSubTab('reset')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'reset'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Reset TPS
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: GOOGLE APPS SCRIPT REALTIME STORAGE */}
      {activeSubTab === 'appscript' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  DATABASE GOOGLE SPREADSHEET REALTIME (APPS SCRIPT)
                </span>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Koneksi Google Apps Script Web App
                </h3>
                <p className="text-xs text-slate-300">
                  Setiap suara yang dicoblos oleh siswa di bilik suara akan otomatis dikirim dan disimpan ke Google Spreadsheet Anda secara realtime!
                </p>
              </div>

              {appsScriptUrl && (
                <span className="px-3 py-1 rounded-xl bg-emerald-950 border border-emerald-600/50 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Webhook Aktif</span>
                </span>
              )}
            </div>

            {appsScriptMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  appsScriptMessage.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-600/40 text-emerald-200'
                    : 'bg-rose-950/70 border border-rose-600/40 text-rose-200'
                }`}
              >
                {appsScriptMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{appsScriptMessage.text}</span>
              </div>
            )}

            {/* Input Web App URL */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                URL Aplikasi Web Google Apps Script (Web App URL)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-none"
                />
                <button
                  onClick={handleSaveAppsScriptUrl}
                  disabled={savingAppsScript || !appsScriptUrl.trim()}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingAppsScript ? 'Menghubungkan...' : 'Simpan & Uji Koneksi'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                *URL didapatkan dari menu <strong>Terapkan (Deploy) &gt; Deployment Baru &gt; Aplikasi Web</strong> di Google Apps Script spreadsheet Anda.
              </p>
            </div>

            {/* Sync All Button */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-white">
                  Sinkronisasi Massal Semua Data (294 Siswa & Rekap Suara)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Kirim seluruh daftar hadir 294 siswa DPT dan perolehan suara paslon saat ini ke Google Spreadsheet dalam 1 kali klik.
                </p>
                {appsScriptLastSync && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                    Sinkronisasi terakhir: {new Date(appsScriptLastSync).toLocaleString('id-ID')} WITA
                  </p>
                )}
              </div>

              <button
                onClick={handleSyncAllAppsScript}
                disabled={syncingAllAppsScript || !appsScriptUrl.trim()}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition self-start sm:self-auto cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${syncingAllAppsScript ? 'animate-bounce' : ''}`} />
                <span>{syncingAllAppsScript ? 'Mengirim Data...' : 'Kirim Semua Data ke Spreadsheet'}</span>
              </button>
            </div>
          </div>

          {/* Apps Script Code Instructions & Copy Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  <span>Kode Google Apps Script Siap Pakai (Code.gs)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Salin skrip ini ke Google Spreadsheet Anda untuk menerima data pemilih & hasil suara secara instan.
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Seluruh Skrip</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-step installation instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <h5 className="font-bold text-white">Buat Spreadsheet Baru</h5>
                <p className="text-slate-400 text-[11px]">
                  Buka tab baru browser ke <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-2.5 h-2.5" /></a>, beri judul "Hasil E-Voting OSIS SMKN 2 Gorontalo".
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <h5 className="font-bold text-white">Buka Ekstensi &gt; Apps Script</h5>
                <p className="text-slate-400 text-[11px]">
                  Klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>. Hapus isi file <code className="text-indigo-300">Code.gs</code> lalu tempelkan kode di bawah ini.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  3
                </span>
                <h5 className="font-bold text-white">Deploy Sebagai Web App</h5>
                <p className="text-slate-400 text-[11px]">
                  Klik <strong>Terapkan (Deploy)</strong> &gt; <strong>Deployment baru</strong> &gt; Jenis <strong>Aplikasi Web</strong>. Set akses <strong>"Siapa saja" (Anyone)</strong>, lalu salin URL-nya.
                </p>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-3 overflow-hidden">
              <pre className="text-[11px] font-mono text-emerald-300/90 max-h-60 overflow-y-auto custom-scrollbar whitespace-pre">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: UPLOAD SPREADSHEET PASLON */}
      {activeSubTab === 'paslon_upload' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  <span>Unggah Spreadsheet Paslon (Otomatis Masuk Bilik Suara)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Perbarui calon ketua & wakil, foto, visi misi dan nomor urut langsung melalui spreadsheet.
                </p>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Format CSV Paslon</span>
              </button>
            </div>

            {uploadMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-600/40 text-emerald-200'
                    : 'bg-rose-950/70 border border-rose-600/40 text-rose-200'
                }`}
              >
                {uploadMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{uploadMessage.text}</span>
              </div>
            )}

            {/* File Upload Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  1. Pilih File Spreadsheet CSV
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition">
                  <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                  <span className="text-xs font-semibold text-white">
                    Klik untuk pilih berkas .csv
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Atau seret dan lepas berkas spreadsheet ke sini
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Atau Tempel Teks CSV Langsung
                  </label>
                  <button
                    onClick={() => setCsvContent(CANDIDATES_SPREADSHEET_TEMPLATE_CSV)}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Gunakan Contoh Format
                  </button>
                </div>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Nomor Urut,Nama Ketua,Nama Wakil,Kelas Ketua,Kelas Wakil,Foto Ketua URL,Foto Wakil URL,Tagline,Visi,Misi,Program Unggulan,Warna Aksen..."
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 custom-scrollbar"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saat diterapkan, paslon di bilik suara akan langsung berganti seketika.</span>
              </div>
              <button
                onClick={handleApplyCandidateCSV}
                disabled={uploading || !csvContent.trim()}
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Terapkan ke Bilik Suara Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Current Loaded Candidates Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h4 className="font-bold text-sm text-white">
              Daftar Paslon yang Sedang Aktif di Bilik Suara ({candidates.length} Paslon)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white px-2 py-0.5 rounded bg-indigo-600">
                      NO. 0{c.nomorUrut}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {c.votes} suara terkumpul
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-white">{c.namaKetua}</div>
                    <div className="text-slate-400">& {c.namaWakil}</div>
                  </div>
                  <div className="text-[11px] text-slate-300 italic line-clamp-1">"{c.visi}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DPT 294 SISWA (DAFTAR PEMILIH TETAP SMKN 2 GORONTALO) */}
      {activeSubTab === 'dpt_list' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-base text-white">
                  Daftar Pemilih Tetap (DPT) SMK Negeri 2 Gorontalo
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Total {voters.length} siswa terdaftar dari 11 jurusan/rombel
              </p>
            </div>

            <a
              href="/api/export/results-csv"
              download
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Kehadiran & Suara (CSV)</span>
            </a>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama siswa, NISN, atau NIPD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
            </div>

            {/* Filter Rombel */}
            <div>
              <select
                value={filterRombel}
                onChange={(e) => setFilterRombel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
              >
                {rombelOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === 'ALL' ? 'Semua Rombel (11 Kelas)' : `Rombel: ${r}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
              >
                <option value="ALL">Semua Status (294 Siswa)</option>
                <option value="voted">Sudah Memilih (Hak Suara Digunakan)</option>
                <option value="not_voted">Belum Memilih</option>
              </select>
            </div>
          </div>

          {/* DPT Table */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/80">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Rombel</th>
                    <th className="py-2.5 px-3">NIPD</th>
                    <th className="py-2.5 px-3">JK</th>
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Status Hak Suara</th>
                    <th className="py-2.5 px-3">Waktu Rekam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {voters.map((v) => (
                    <tr key={v.nisn} className="hover:bg-slate-900/50 transition">
                      <td className="py-2 px-3 font-mono text-slate-500">{v.no}</td>
                      <td className="py-2 px-3 font-semibold text-white">{v.nama}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                          {v.rombel}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">{v.nipd}</td>
                      <td className="py-2 px-3">{v.jk}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{v.nisn}</td>
                      <td className="py-2 px-3">
                        {v.hasVoted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600/40 text-emerald-400 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            SUDAH MEMILIH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                            <Clock className="w-3 h-3 text-amber-400" />
                            BELUM
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                        {v.votedAt || '-'}
                      </td>
                    </tr>
                  ))}
                  {voters.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Tidak ada siswa yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: GOOGLE SHEETS CSV IMPORT */}
      {activeSubTab === 'google_sheet' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-indigo-400" />
              <span>Import Data dari Google Spreadsheet (Format Link Publik)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tarik data kandidat atau pemilih dari Google Spreadsheet yang sudah Anda publikasikan ke web.
            </p>
          </div>

          {syncMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-600/40 text-emerald-200'
                  : 'bg-rose-950/70 border border-rose-600/40 text-rose-200'
              }`}
            >
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{syncMessage.text}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              URL Google Spreadsheet (Mode Publik / Anyone with link can view)
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleSyncGoogleSheet('candidates')}
              disabled={syncing || !sheetUrl.trim()}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Tarik & Sinkronkan Paslon dari Google Sheets</span>
            </button>
            <button
              onClick={() => handleSyncGoogleSheet('voters')}
              disabled={syncing || !sheetUrl.trim()}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tarik & Sinkronkan DPT dari Google Sheets</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: RESET PEMILIHAN (PANITIA PIN) */}
      {activeSubTab === 'reset' && (
        <div className="bg-slate-900 border border-rose-900/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 max-w-xl mx-auto">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-1">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white">
              Reset Pemungutan Suara TPS
            </h3>
            <p className="text-xs text-slate-400">
              Tindakan ini akan mengosongkan seluruh perolehan suara paslon dan mengembalikan hak suara seluruh 294 siswa menjadi aktif kembali.
            </p>
          </div>

          {resetMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                resetMessage.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-600/40 text-emerald-200'
                  : 'bg-rose-950/70 border border-rose-600/40 text-rose-200'
              }`}
            >
              {resetMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{resetMessage.text}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Kata Sandi Otorisasi Panitia
            </label>
            <input
              type="password"
              value={resetPin}
              onChange={(e) => setResetPin(e.target.value)}
              placeholder="Masukkan Kata Sandi Panitia..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono text-center tracking-widest outline-none"
            />
          </div>

          <button
            onClick={handleResetElection}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Konfirmasi Reset Semua Suara ke 0</span>
          </button>
        </div>
      )}
    </div>
  );
};
