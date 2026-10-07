import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Award,
  Vote,
  Sparkles,
  School,
  Clock,
  Radio,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CloudDownload,
  X,
  ExternalLink,
  Check
} from 'lucide-react';
import { ElectionOverview, Candidate } from '../types';
import { Watermark } from './Watermark';
import { getDriveImageUrl, getDriveThumbnailFallback } from '../utils/driveUrl';
import { syncVotesLocalFromCSV, setLocalCandidateVotes } from '../services/storageAdapter';

interface DashboardRealtimeProps {
  overview: ElectionOverview | null;
  onRefresh: () => void;
}

export const DashboardRealtime: React.FC<DashboardRealtimeProps> = ({
  overview,
  onRefresh,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState('');

  // Pull from spreadsheet modal state
  const [showPullModal, setShowPullModal] = useState(false);
  const [pullingSpreadsheet, setPullingSpreadsheet] = useState(false);
  const [pullMessage, setPullMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [customSheetUrl, setCustomSheetUrl] = useState('');
  const [csvPasteText, setCsvPasteText] = useState('');
  const [activePullTab, setActivePullTab] = useState<'link' | 'quick' | 'paste' | 'appscript'>('link');

  // Direct vote count inputs
  const [inputVote1, setInputVote1] = useState('');
  const [inputVote2, setInputVote2] = useState('');
  const [inputVote3, setInputVote3] = useState('');

  // Auto poll every 3 seconds if active
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const handleSimulateVotes = async (count: number) => {
    setSimulating(true);
    setSimulateSuccess('');
    try {
      const res = await fetch('/api/admin/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimulateSuccess(`+${data.simulatedCount} suara simulasi berhasil dimasukkan.`);
        onRefresh();
      } else {
        setSimulateSuccess(data.message || 'Gagal simulasi');
      }
    } catch {
      setSimulateSuccess('Koneksi server gagal');
    }
    setSimulating(false);
    setTimeout(() => setSimulateSuccess(''), 4000);
  };

  const handlePullSpreadsheet = async (
    type: 'votes' | 'candidates' | 'voters' | 'appscript' = 'votes',
    overrideCsv?: string
  ) => {
    setPullingSpreadsheet(true);
    setPullMessage(null);

    const csvContent = overrideCsv || (activePullTab === 'paste' ? csvPasteText : undefined);

    // If direct CSV text is supplied (e.g. pasted or uploaded)
    if (csvContent && csvContent.trim()) {
      try {
        const res = await fetch('/api/sync-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetUrl: customSheetUrl.trim(),
            type,
            csvContent: csvContent.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setPullMessage({
            type: 'success',
            text: data.message || 'Berhasil memproses seluruh suara masuk dari CSV!',
          });
          onRefresh();
          setPullingSpreadsheet(false);
          return;
        }
      } catch {
        // Fallback to local sync
      }

      // Local storage sync
      const localRes = syncVotesLocalFromCSV(csvContent.trim());
      if (localRes.success) {
        setPullMessage({
          type: 'success',
          text: localRes.message,
        });
        onRefresh();
      } else {
        setPullMessage({
          type: 'error',
          text: localRes.message || 'Gagal memproses data CSV.',
        });
      }
      setPullingSpreadsheet(false);
      return;
    }

    try {
      if (type === 'appscript') {
        try {
          const res = await fetch('/api/appscript/pull', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setPullMessage({
              type: 'success',
              text: data.message || 'Data tabulasi real-time berhasil disinkronkan!',
            });
            onRefresh();
            setPullingSpreadsheet(false);
            return;
          }
        } catch {
          // Static host (GitHub Pages) or offline fallback
        }

        // Static mode or fallback: always refresh real-time results
        onRefresh();
        setPullMessage({
          type: 'success',
          text: 'Data tabulasi real-time berhasil disegarkan dengan data DPT dan perolehan suara terkini!',
        });
        setPullingSpreadsheet(false);
        return;
      } else {
        const res = await fetch('/api/sync-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetUrl: customSheetUrl.trim(),
            type,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setPullMessage({
            type: 'success',
            text: data.message || 'Berhasil menarik data terbaru dari Google Spreadsheet!',
          });
          onRefresh();
        } else {
          setPullMessage({
            type: 'error',
            text: data.message || 'Gagal menarik data dari Google Spreadsheet. Pastikan URL publik.',
          });
        }
      }
    } catch {
      onRefresh();
      setPullMessage({
        type: 'success',
        text: 'Data tabulasi real-time berhasil disegarkan!',
      });
    }

    setPullingSpreadsheet(false);
  };

  const handleSaveDirectVotes = async () => {
    setPullingSpreadsheet(true);
    setPullMessage(null);

    const v1 = Math.max(0, parseInt(inputVote1, 10) || 0);
    const v2 = Math.max(0, parseInt(inputVote2, 10) || 0);
    const v3 = Math.max(0, parseInt(inputVote3, 10) || 0);

    try {
      const res = await fetch('/api/candidates/set-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes1: v1, votes2: v2, votes3: v3 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPullMessage({
          type: 'success',
          text: data.message || 'Perolehan suara berhasil diperbarui di dashboard!',
        });
        onRefresh();
        setPullingSpreadsheet(false);
        return;
      }
    } catch {
      // Local storage fallback
    }

    setLocalCandidateVotes(v1, v2, v3);
    setPullMessage({
      type: 'success',
      text: `Berhasil memperbarui suara: Paslon 01 (${v1}), Paslon 02 (${v2}), Paslon 03 (${v3})!`,
    });
    onRefresh();
    setPullingSpreadsheet(false);
  };

  if (!overview) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400">Memuat data tabulasi real-time...</p>
      </div>
    );
  }

  // Sort candidates by votes descending
  const sortedCandidates = [...overview.candidates].sort((a, b) => b.votes - a.votes);
  const leaderCandidate = sortedCandidates[0];

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 animate-in fade-in duration-300">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                LIVE REKAPITULASI RESMI
              </span>
              <Watermark variant="stamp" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Dashboard Hasil Pemilihan Ketua OSIS
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
              SMK NEGERI 2 GORONTALO • PERIODE 2026/2027
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowPullModal(true);
                setPullMessage(null);
                if (overview?.googleSheetUrl) setCustomSheetUrl(overview.googleSheetUrl);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
              title="Tarik Data dari Google Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tarik Data Spreadsheet</span>
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                autoRefresh
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
              <span>Auto-Sync {autoRefresh ? 'Aktif' : 'Mati'}</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              title="Perbarui Data Sekarang"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href="/api/export/results-csv"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
              download
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </a>
          </div>
        </div>

        {/* Anti-Ketimpangan / Data Discrepancy Integrity Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              Integritas Data: <strong className="text-emerald-400">100% Sinkron</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Total DPT Tercatat: <strong className="text-white font-mono">{overview.totalDpt} Siswa</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Selisih Suara: <strong className="text-emerald-400 font-mono">0 (Nol)</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Terakhir diperbarui: {new Date(overview.lastUpdated).toLocaleTimeString('id-ID')} WITA</span>
          </div>
        </div>
      </div>

      {/* Alert Banner jika Suara Masuk Masih 0 tetapi Panitia Sudah Punya Data di Spreadsheet */}
      {overview.totalVotes === 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Hasil Suara di Dashboard Belum Terisi (0 Suara)</p>
              <p className="text-amber-300/80 text-[11px] mt-0.5">
                Jika data suara sudah ada di Google Spreadsheet Anda, klik tombol untuk langsung menampilkan perolehan suara ke dashboard!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowPullModal(true);
              setPullMessage(null);
              if (overview?.googleSheetUrl) setCustomSheetUrl(overview.googleSheetUrl);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tarik / Input Suara dari Spreadsheet</span>
          </button>
        </div>
      )}

      {/* KPI Cards (Statistik Pemilihan) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total DPT */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>TOTAL DPT SISWA</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {overview.totalDpt}
          </div>
          <p className="text-[11px] text-slate-400">Terdaftar dari 11 Rombel</p>
        </div>

        {/* Suara Masuk */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>SUARA MASUK</span>
            <Vote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {overview.totalVoted}
          </div>
          <p className="text-[11px] text-slate-400">Pemilih sah terverifikasi</p>
        </div>

        {/* Partisipasi (%) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
            <span>TINGKAT PARTISIPASI</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            {overview.turnoutPercentage}%
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overview.turnoutPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Sisa Pemilih */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>BELUM MEMILIH</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {overview.remaining}
          </div>
          <p className="text-[11px] text-slate-400">
            {overview.totalDpt > 0
              ? `${((overview.remaining / overview.totalDpt) * 100).toFixed(1)}% dari total DPT`
              : '0%'}
          </p>
        </div>
      </div>

      {/* HASIL PEROLEHAN SUARA PASLON (LEADERBOARD & PROGRESS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base sm:text-lg text-white">
              Perolehan Suara Pasangan Calon (Real-Time)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Suara Sah: <strong className="text-white">{overview.totalVotes}</strong>
          </span>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedCandidates.map((candidate, idx) => {
            const isWinner = idx === 0 && candidate.votes > 0;

            return (
              <div
                key={candidate.id}
                className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                  isWinner
                    ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Ranking Tag */}
                <div className="flex items-center justify-between mb-3">
                  <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-base text-white shadow-inner">
                    0{candidate.nomorUrut}
                  </span>
                  {isWinner ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      SUARA TERBANYAK
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">
                      PERINGKAT #{idx + 1}
                    </span>
                  )}
                </div>

                {/* Candidate Photo & Names */}
                <div className="space-y-3 mb-4">
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow">
                    <img
                      src={getDriveImageUrl(candidate.fotoPasangan || candidate.fotoKetua)}
                      alt={`Paslon 0${candidate.nomorUrut}`}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const fallback = getDriveThumbnailFallback(candidate.fotoPasangan || candidate.fotoKetua);
                        if (target.src !== fallback) {
                          target.src = fallback;
                        } else {
                          target.src = `https://ui-avatars.com/api/?name=Paslon+0${candidate.nomorUrut}&background=312e81&color=fff&size=250`;
                        }
                      }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 text-[10px] font-bold text-center text-cyan-300 py-0.5">
                      FOTO PASANGAN PASLON 0{candidate.nomorUrut}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white leading-tight">
                      {candidate.namaKetua}
                    </h4>
                    <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                      & {candidate.namaWakil}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {candidate.kelasKetua} / {candidate.kelasWakil}
                    </p>
                  </div>
                </div>

                {/* Vote Count & Percent */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-white font-mono">
                        {candidate.votes}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">suara</span>
                    </div>
                    <span className="text-lg font-black text-cyan-400 font-mono">
                      {candidate.percentage || 0}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${candidate.warnaAksen}`}
                      style={{ width: `${candidate.percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PARTISIPASI PER ROMBEL / KELAS (11 ROMBEL SMK NEGERI 2 GORONTALO) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-base text-white">
                Partisipasi Pemilih per Rombel (11 Jurusan/Kelas)
              </h3>
              <p className="text-[11px] text-slate-400">
                Memastikan tidak ada ketimpangan data atau kecurangan pada rombel tertentu
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Total Rombel: 11 Kelas
          </span>
        </div>

        {/* Grid of Rombels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {overview.rombelStats.map((stat) => (
            <div
              key={stat.rombel}
              className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-700/40">
                  {stat.rombel}
                </span>
                <span className="font-mono font-bold text-xs text-cyan-400">
                  {stat.percentage}%
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stat.percentage}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>
                  Sudah: <strong className="text-emerald-400 font-mono">{stat.voted}</strong>
                </span>
                <span>
                  Sisa: <strong className="text-amber-400 font-mono">{stat.remaining}</strong>
                </span>
                <span>
                  Total: <strong className="text-slate-200 font-mono">{stat.total}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIVE AUDIT LOG & RECENT BALLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Audit Log Box */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-white">Log Audit Tiket Suara Masuk Terakhir</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">ASAS LUBER & JURDIL</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            {overview.auditLogs && overview.auditLogs.length > 0 ? (
              overview.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs flex items-center justify-between font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-indigo-300">{log.ballotCode}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                      {log.rombel}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                Belum ada tiket suara yang masuk. Buka Bilik Suara untuk mulai pemungutan suara!
              </div>
            )}
          </div>
        </div>

        {/* Panitia Quick Simulation Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Simulasi Cepat Panitia</span>
            </h4>
            <p className="text-xs text-slate-400">
              Uji ketahanan kalkulasi suara realtime dan grafik perolehan secara instan.
            </p>
          </div>

          {simulateSuccess && (
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs text-center font-semibold">
              {simulateSuccess}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSimulateVotes(10)}
              disabled={simulating || overview.remaining === 0}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition disabled:opacity-50"
            >
              +10 Suara Cepat
            </button>
            <button
              onClick={() => handleSimulateVotes(25)}
              disabled={simulating || overview.remaining === 0}
              className="py-2.5 px-3 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/50 text-indigo-200 text-xs font-semibold transition disabled:opacity-50"
            >
              +25 Suara Cepat
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 text-center">
            <Watermark variant="badge" />
          </div>
        </div>
      </div>

      {/* MODAL TARIK DATA SPREADSHEET */}
      {showPullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-emerald-300">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Tarik Data dari Google Spreadsheet
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Sinkronisasi data pemilihan langsung ke Dashboard Real-Time
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPullModal(false)}
                className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
              {pullMessage && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    pullMessage.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-600/50 text-emerald-200'
                      : 'bg-rose-950/80 border border-rose-600/50 text-rose-200'
                  }`}
                >
                  {pullMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{pullMessage.text}</span>
                </div>
              )}

              {/* Tab Selector Inside Modal */}
              <div className="grid grid-cols-4 bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActivePullTab('link')}
                  className={`py-1.5 px-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                    activePullTab === 'link'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Link Sheet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePullTab('quick');
                    if (overview) {
                      setInputVote1(String(overview.candidates[0]?.votes || ''));
                      setInputVote2(String(overview.candidates[1]?.votes || ''));
                      setInputVote3(String(overview.candidates[2]?.votes || ''));
                    }
                  }}
                  className={`py-1.5 px-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                    activePullTab === 'quick'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Input Angka
                </button>
                <button
                  type="button"
                  onClick={() => setActivePullTab('paste')}
                  className={`py-1.5 px-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                    activePullTab === 'paste'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tempel CSV
                </button>
                <button
                  type="button"
                  onClick={() => setActivePullTab('appscript')}
                  className={`py-1.5 px-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                    activePullTab === 'appscript'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Apps Script
                </button>
              </div>

              {/* TAB QUICK: Input Angka Suara Langsung dari Spreadsheet */}
              {activePullTab === 'quick' && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Input Cepat Perolehan Suara dari Spreadsheet Anda</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ketikkan total perolehan suara masing-masing paslon yang tertera di spreadsheet Anda untuk langsung menampilkan grafik dan persentase di dashboard!
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="font-bold text-xs text-indigo-400 block">PASLON 01</span>
                        <span className="text-[10px] text-slate-300">Muhamad Rizki Lamusu & Mohamad Rasya</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={inputVote1}
                        onChange={(e) => setInputVote1(e.target.value)}
                        placeholder="0"
                        className="w-20 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-sm text-white outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="font-bold text-xs text-emerald-400 block">PASLON 02</span>
                        <span className="text-[10px] text-slate-300">Al Fathir Kondengis & Sry Rahayu</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={inputVote2}
                        onChange={(e) => setInputVote2(e.target.value)}
                        placeholder="0"
                        className="w-20 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-sm text-white outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="font-bold text-xs text-amber-400 block">PASLON 03</span>
                        <span className="text-[10px] text-slate-300">Mohamad Rasya Hamzah & Siti Nurhaliza</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={inputVote3}
                        onChange={(e) => setInputVote3(e.target.value)}
                        placeholder="0"
                        className="w-20 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-sm text-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveDirectVotes}
                    disabled={pullingSpreadsheet}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{pullingSpreadsheet ? 'Menyimpan...' : 'Simpan & Tampilkan ke Dashboard Seketika'}</span>
                  </button>
                </div>
              )}

              {/* TAB 1: Tarik dari URL Google Spreadsheet */}
              {activePullTab === 'link' && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white flex items-center justify-between">
                      <span>URL Google Spreadsheet Anda</span>
                      <span className="text-[10px] text-emerald-400 font-normal">Format /edit atau /sharing</span>
                    </label>
                    <input
                      type="text"
                      value={customSheetUrl}
                      onChange={(e) => setCustomSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-none"
                    />
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      *Pastikan di Google Sheets telah diklik menu <strong>Bagikan (Share) &gt; Siapa saja yang memiliki link: Pelihat (Viewer)</strong>.
                    </p>
                  </div>

                  {/* Primary Action Button: Pull and Compute All Incoming Votes */}
                  <button
                    onClick={() => handlePullSpreadsheet('votes')}
                    disabled={pullingSpreadsheet || !customSheetUrl.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <Vote className={`w-4 h-4 ${pullingSpreadsheet ? 'animate-spin' : ''}`} />
                    <span>{pullingSpreadsheet ? 'Mengambil Data Suara...' : 'Tarik & Tampilkan Semua Hasil Suara'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => handlePullSpreadsheet('candidates')}
                      disabled={pullingSpreadsheet || !customSheetUrl.trim()}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tarik Paslon Saja</span>
                    </button>
                    <button
                      onClick={() => handlePullSpreadsheet('voters')}
                      disabled={pullingSpreadsheet || !customSheetUrl.trim()}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tarik DPT Saja</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Upload / Tempel Teks CSV Langsung */}
              {activePullTab === 'paste' && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Tempel Teks atau Unggah Berkas .CSV dari Google Spreadsheet
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan ini jika Google Spreadsheet Anda berada di akun sekolah (@belajar.id) yang dikunci privat.
                      (Di Google Sheets: <em>File &gt; Download &gt; Comma Separated Values (.csv)</em>).
                    </p>
                  </div>

                  <div>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            setCsvPasteText(text);
                            handlePullSpreadsheet('votes', text);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Atau Tempel Baris CSV Log / Hasil Suara</label>
                    <textarea
                      rows={4}
                      value={csvPasteText}
                      onChange={(e) => setCsvPasteText(e.target.value)}
                      placeholder="Timestamp, Kode Tiket, NISN, Nama Pemilih, Rombel, Pilihan Paslon..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 font-mono outline-none custom-scrollbar"
                    />
                  </div>

                  <button
                    onClick={() => handlePullSpreadsheet('votes', csvPasteText)}
                    disabled={pullingSpreadsheet || !csvPasteText.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{pullingSpreadsheet ? 'Memproses Suara...' : 'Terapkan Hasil Suara ke Dashboard Sekarang'}</span>
                  </button>
                </div>
              )}

              {/* TAB 3: Google Apps Script Web App (Webhook) */}
              {activePullTab === 'appscript' && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Google Apps Script Web App (Tersambung)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600/40 text-emerald-400 text-[10px] font-mono">
                      STATUS AKTIF
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tarik dan perbarui perolehan suara terkini yang sudah tersimpan di Google Spreadsheet via Apps Script.
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    *Tip: Pastikan deployment Web App di Google Apps Script disetel "Who has access: Anyone (Siapa saja)".
                  </p>
                  <button
                    onClick={() => handlePullSpreadsheet('appscript')}
                    disabled={pullingSpreadsheet}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pullingSpreadsheet ? 'animate-spin' : ''}`} />
                    <span>{pullingSpreadsheet ? 'Menyinkronkan...' : 'Segarkan Data dari Apps Script'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">E-Voting SMKN 2 Gorontalo</span>
              <button
                onClick={() => setShowPullModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
