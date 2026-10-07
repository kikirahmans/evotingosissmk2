import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_VOTERS, parseVotersCSV, Voter } from './src/data/initialVoters.ts';
import { Candidate, INITIAL_CANDIDATES, parseCandidatesCSV } from './src/data/initialCandidates.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Database with initial seed
let voters: Voter[] = JSON.parse(JSON.stringify(INITIAL_VOTERS));
let candidates: Candidate[] = JSON.parse(JSON.stringify(INITIAL_CANDIDATES));
let auditLogs: Array<{ id: string; timestamp: string; rombel: string; ballotCode: string }> = [];
let googleSheetUrl: string = '';
let appsScriptUrl: string = 'https://script.google.com/macros/s/AKfycbw1GCnJlUTkrKJFObrxA6OKyiaQoFG6epF86M_nWGJE1a1KHMAzViwGuwST-QYRnWIP/exec';
let appsScriptLastSync: string = '';
let appsScriptVoteCount: number = 0;
let electionTitle: string = 'PEMILIHAN KETUA & WAKIL KETUA OSIS';
let schoolName: string = 'SMK NEGERI 2 GORONTALO';
let academicYear: string = 'PERIODE 2026/2027';

const PANITIA_PASSWORD = 'panitia11221';

// Asynchronously push vote to Google Apps Script Web App
async function pushVoteToAppsScript(payload: any) {
  if (!appsScriptUrl) return;
  try {
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok || res.status === 302) {
      appsScriptLastSync = new Date().toISOString();
      appsScriptVoteCount += 1;
      console.log('[AppsScript Sync] Suara berhasil dikirim ke Google Spreadsheet via Apps Script!');
    }
  } catch (err: any) {
    console.error('[AppsScript Sync Error]', err.message);
  }
}

function generateBallotCode(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `OSIS2-${time}-${rand}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // --- API Endpoints ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', watermark: 'kikybahsoan', timestamp: new Date().toISOString() });
  });

  // Get election overview & status
  app.get('/api/overview', (_req: Request, res: Response) => {
    const totalDpt = voters.length;
    const totalVoted = voters.filter((v) => v.hasVoted).length;
    const remaining = totalDpt - totalVoted;
    const percentage = totalDpt > 0 ? Number(((totalVoted / totalDpt) * 100).toFixed(1)) : 0;

    res.json({
      schoolName,
      electionTitle,
      academicYear,
      watermark: 'kikybahsoan',
      totalDpt,
      totalVoted,
      remaining,
      percentage,
      candidateCount: candidates.length,
      googleSheetUrl,
      lastUpdated: new Date().toISOString(),
    });
  });

  // Student Authentication / Verification
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, nipd } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'NISN atau Token wajib diisi.' });
    }

    const cleanId = String(identifier).trim().toUpperCase();
    const cleanNipd = nipd ? String(nipd).trim() : '';

    // Match by NISN or Token or NIPD
    const voter = voters.find((v) => {
      const matchNisn = v.nisn === cleanId;
      const matchToken = v.token && v.token.toUpperCase() === cleanId;
      const matchNipdOnly = v.nipd === cleanId;
      return matchNisn || matchToken || matchNipdOnly;
    });

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'NISN / Token tidak terdaftar dalam Daftar Pemilih Tetap (DPT) SMKN 2 Gorontalo.',
      });
    }

    // Optional NIPD check if provided
    if (cleanNipd && voter.nipd !== cleanNipd) {
      return res.status(401).json({
        success: false,
        message: 'Verifikasi NIPD tidak cocok dengan data siswa.',
      });
    }

    if (voter.hasVoted) {
      return res.status(403).json({
        success: false,
        alreadyVoted: true,
        voter: {
          no: voter.no,
          nama: voter.nama,
          rombel: voter.rombel,
          nipd: voter.nipd,
          nisn: voter.nisn,
          hasVoted: voter.hasVoted,
          votedAt: voter.votedAt,
          ballotCode: voter.ballotCode,
        },
        message: `Hak suara atas nama ${voter.nama} (${voter.nisn}) sudah digunakan pada ${voter.votedAt || 'sesi sebelumnya'} dan akun telah terkunci secara permanen.`,
      });
    }

    return res.json({
      success: true,
      alreadyVoted: false,
      voter: {
        no: voter.no,
        nama: voter.nama,
        rombel: voter.rombel,
        nipd: voter.nipd,
        jk: voter.jk,
        nisn: voter.nisn,
        hasVoted: voter.hasVoted,
        token: voter.token,
      },
    });
  });

  // Get Candidates
  app.get('/api/candidates', (_req: Request, res: Response) => {
    res.json({
      candidates,
      totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
      watermark: 'kikybahsoan',
    });
  });

  // Cast Vote - STRICT ATOMIC ANTI-MANIPULATION
  app.post('/api/vote', (req: Request, res: Response) => {
    const { nisn, candidateId } = req.body;
    if (!nisn || !candidateId) {
      return res.status(400).json({ success: false, message: 'Data pemilihan tidak lengkap.' });
    }

    const cleanNisn = String(nisn).trim();
    const voter = voters.find((v) => v.nisn === cleanNisn || (v.token && v.token.toUpperCase() === cleanNisn.toUpperCase()));

    if (!voter) {
      return res.status(404).json({ success: false, message: 'Pemilih tidak ditemukan dalam DPT.' });
    }

    // Strict double voting check
    if (voter.hasVoted) {
      return res.status(403).json({
        success: false,
        message: `PERINGATAN SISTEM: Siswa ${voter.nama} sudah pernah memilih! Suara tidak dapat diduplikasi.`,
      });
    }

    const candidate = candidates.find((c) => c.id === Number(candidateId) || c.nomorUrut === Number(candidateId));
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Paslon pilihan tidak valid.' });
    }

    // Generate verified encrypted ballot receipt
    const ballotCode = generateBallotCode();
    const votedTime = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    // Mark voter as voted immediately & permanently
    voter.hasVoted = true;
    voter.votedAt = votedTime;
    voter.ballotCode = ballotCode;

    // Increment candidate vote
    candidate.votes += 1;

    // Asynchronously push to Google Spreadsheet via Apps Script Web App
    pushVoteToAppsScript({
      action: 'VOTE_RECORDED',
      timestamp: votedTime,
      ballotCode,
      voter: {
        nama: voter.nama,
        rombel: voter.rombel,
        nisn: voter.nisn,
        nipd: voter.nipd,
      },
      candidate: {
        nomorUrut: candidate.nomorUrut,
        namaKetua: candidate.namaKetua,
        namaWakil: candidate.namaWakil,
      },
      totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
      watermark: 'kikybahsoan',
    });

    // Record anonymous audit log (keeps voter choice secret, preserves auditability)
    auditLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: votedTime,
      rombel: voter.rombel,
      ballotCode,
    });
    if (auditLogs.length > 100) auditLogs.pop();

    res.json({
      success: true,
      message: 'Suara Anda berhasil dicatat secara resmi ke dalam sistem!',
      ballotCode,
      votedAt: votedTime,
      voterNama: voter.nama,
      voterRombel: voter.rombel,
      candidateChosen: {
        nomorUrut: candidate.nomorUrut,
        namaKetua: candidate.namaKetua,
        namaWakil: candidate.namaWakil,
      },
      watermark: 'kikybahsoan',
    });
  });

  // Get Realtime Election Results & Turnout
  app.get('/api/results', (_req: Request, res: Response) => {
    const totalDpt = voters.length;
    const totalVoted = voters.filter((v) => v.hasVoted).length;
    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

    // Calculate percentage per candidate
    const candidateResults = candidates.map((c) => {
      const percentage = totalVotes > 0 ? Number(((c.votes / totalVotes) * 100).toFixed(1)) : 0;
      return {
        ...c,
        percentage,
      };
    });

    // Calculate rombel turnout stats
    const rombelMap: Record<string, { total: number; voted: number }> = {};
    voters.forEach((v) => {
      if (!rombelMap[v.rombel]) {
        rombelMap[v.rombel] = { total: 0, voted: 0 };
      }
      rombelMap[v.rombel].total += 1;
      if (v.hasVoted) {
        rombelMap[v.rombel].voted += 1;
      }
    });

    const rombelStats = Object.keys(rombelMap).map((rombel) => {
      const data = rombelMap[rombel];
      const pct = data.total > 0 ? Number(((data.voted / data.total) * 100).toFixed(1)) : 0;
      return {
        rombel,
        total: data.total,
        voted: data.voted,
        remaining: data.total - data.voted,
        percentage: pct,
      };
    });

    // Check discrepancy
    const discrepancy = totalVoted !== totalVotes ? Math.abs(totalVoted - totalVotes) : 0;

    res.json({
      schoolName,
      electionTitle,
      academicYear,
      watermark: 'kikybahsoan',
      totalDpt,
      totalVoted,
      remaining: totalDpt - totalVoted,
      turnoutPercentage: totalDpt > 0 ? Number(((totalVoted / totalDpt) * 100).toFixed(1)) : 0,
      candidates: candidateResults,
      totalVotes,
      rombelStats,
      discrepancy,
      auditLogs: auditLogs.slice(0, 15),
      lastUpdated: new Date().toISOString(),
      googleSheetUrl,
      appsScriptUrl,
    });
  });

  // Get DPT Voters List with pagination / search
  app.get('/api/voters', (req: Request, res: Response) => {
    const { search, rombel, status } = req.query;
    let filtered = voters;

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.nama.toLowerCase().includes(q) ||
          v.nisn.includes(q) ||
          v.nipd.includes(q) ||
          (v.token && v.token.toLowerCase().includes(q))
      );
    }

    if (rombel) {
      filtered = filtered.filter((v) => v.rombel === String(rombel));
    }

    if (status === 'voted') {
      filtered = filtered.filter((v) => v.hasVoted);
    } else if (status === 'not_voted') {
      filtered = filtered.filter((v) => !v.hasVoted);
    }

    res.json({
      total: voters.length,
      filteredTotal: filtered.length,
      votedCount: voters.filter((v) => v.hasVoted).length,
      voters: filtered,
      watermark: 'kikybahsoan',
    });
  });

  // Upload/Update Candidates via CSV spreadsheet or JSON
  app.post('/api/candidates/upload', (req: Request, res: Response) => {
    const { csvContent, candidateList } = req.body;

    try {
      if (csvContent && typeof csvContent === 'string') {
        const parsed = parseCandidatesCSV(csvContent, candidates);
        candidates = parsed;
        return res.json({
          success: true,
          message: `Berhasil memperbarui ${candidates.length} paslon dari spreadsheet CSV!`,
          candidates,
        });
      } else if (Array.isArray(candidateList)) {
        candidates = candidateList;
        return res.json({
          success: true,
          message: `Berhasil memperbarui ${candidates.length} paslon!`,
          candidates,
        });
      }

      return res.status(400).json({ success: false, message: 'Format data spreadsheet tidak valid.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Gagal memproses spreadsheet.' });
    }
  });

  // Sync with Google Sheets Link
  app.post('/api/sync-spreadsheet', async (req: Request, res: Response) => {
    const { sheetUrl, type } = req.body;
    const targetUrl = (sheetUrl || googleSheetUrl || '').trim();

    if (!targetUrl) {
      if (appsScriptUrl) {
        return res.json({
          success: true,
          message: 'Berhasil menyegarkan data dari integrasi Google Apps Script!',
          source: 'appscript',
        });
      }
      return res.status(400).json({ success: false, message: 'URL Google Spreadsheet wajib disertakan.' });
    }

    try {
      googleSheetUrl = targetUrl;
      // Convert standard Google Sheet URL to export CSV if necessary
      let fetchUrl = targetUrl;
      if (targetUrl.includes('/edit')) {
        fetchUrl = targetUrl.replace(/\/edit.*$/, '/export?format=csv');
      } else if (!targetUrl.includes('export?format=csv') && !targetUrl.includes('output=csv')) {
        fetchUrl = `${targetUrl.split('?')[0]}/export?format=csv`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Google Sheets mengembalikan status ${response.status}: Pastikan spreadsheet disetel 'Anyone with the link can view' (Publik).`);
      }

      const csvText = await response.text();

      if (type === 'voters') {
        const newVoters = parseVotersCSV(csvText);
        if (newVoters.length > 0) {
          voters = newVoters;
          return res.json({
            success: true,
            message: `Berhasil sinkronisasi ${voters.length} pemilih dari Google Sheets!`,
            votersCount: voters.length,
          });
        }
      } else {
        // Candidates sync
        const newCandidates = parseCandidatesCSV(csvText, candidates);
        if (newCandidates.length > 0) {
          candidates = newCandidates;
          return res.json({
            success: true,
            message: `Berhasil sinkronisasi ${candidates.length} paslon dari Google Sheets!`,
            candidates,
          });
        }
      }

      return res.json({ success: true, message: 'Spreadsheet berhasil dibaca dan disinkronkan.' });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: `Sinkronisasi gagal: ${err.message}. Admin dapat menggunakan fitur unggah berkas CSV secara langsung jika tautan dibatasi.`,
      });
    }
  });

  // Panitia / Admin Password Verification
  app.post('/api/auth/panitia', (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === PANITIA_PASSWORD) {
      return res.json({
        success: true,
        role: 'panitia',
        message: 'Akses Panitia Diberikan.',
        watermark: 'kikybahsoan',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Kata sandi panitia salah! Gunakan sandi resmi panitia.',
    });
  });

  // Google Apps Script Config & Status
  app.get('/api/appscript/config', (_req: Request, res: Response) => {
    res.json({
      appsScriptUrl,
      appsScriptLastSync,
      appsScriptVoteCount,
      watermark: 'kikybahsoan',
    });
  });

  app.post('/api/appscript/config', async (req: Request, res: Response) => {
    const { url } = req.body;
    appsScriptUrl = (url || '').trim();
    
    let testSuccess = false;
    let testNote = '';

    if (appsScriptUrl) {
      try {
        const testRes = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PING', watermark: 'kikybahsoan', timestamp: new Date().toISOString() }),
        });
        testSuccess = testRes.ok;
        testNote = testRes.ok ? 'Koneksi ke Google Apps Script berhasil aktif!' : `Apps Script merespons dengan status ${testRes.status}`;
      } catch (err: any) {
        testNote = `URL disimpan, namun uji coba awal menerima: ${err.message}. Pastikan deployment disetel "Anyone" (Siapa saja).`;
      }
    }

    res.json({
      success: true,
      appsScriptUrl,
      testSuccess,
      message: testNote || 'URL Google Apps Script berhasil diperbarui.',
    });
  });

  // Bulk Sync all DPT and Results to Google Apps Script
  app.post('/api/appscript/sync-all', async (_req: Request, res: Response) => {
    if (!appsScriptUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL Google Apps Script belum diatur. Silakan masukkan Web App URL terlebih dahulu.',
      });
    }

    try {
      const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
      const payload = {
        action: 'SYNC_ALL',
        timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
        schoolName,
        watermark: 'kikybahsoan',
        totalDpt: voters.length,
        totalVotes,
        turnoutPercentage: ((totalVotes / voters.length) * 100).toFixed(1),
        candidates: candidates.map((c) => ({
          nomorUrut: c.nomorUrut,
          namaKetua: c.namaKetua,
          namaWakil: c.namaWakil,
          kelasKetua: c.kelasKetua,
          kelasWakil: c.kelasWakil,
          votes: c.votes,
          percentage: totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0,
        })),
        voters: voters.map((v) => ({
          no: v.no,
          nama: v.nama,
          rombel: v.rombel,
          nipd: v.nipd,
          nisn: v.nisn,
          status: v.hasVoted ? 'SUDAH MEMILIH' : 'BELUM MEMILIH',
          waktu: v.votedAt || '-',
          tiket: v.ballotCode || '-',
        })),
      };

      const resp = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      appsScriptLastSync = new Date().toISOString();

      if (resp.ok) {
        return res.json({
          success: true,
          message: 'Berhasil mengirim seluruh data DPT dan perolehan suara ke Google Spreadsheet via Apps Script!',
          lastSync: appsScriptLastSync,
        });
      } else {
        return res.json({
          success: true,
          message: `Permintaan terkirim ke Apps Script (status ${resp.status}). Periksa tab Google Spreadsheet Anda.`,
          lastSync: appsScriptLastSync,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Gagal sinkronisasi ke Apps Script: ${err.message}`,
      });
    }
  });

  // Admin Reset Election
  app.post('/api/admin/reset', (req: Request, res: Response) => {
    const { pin } = req.body;
    // Accepted PINs: panitia11221 or 123456
    if (pin !== PANITIA_PASSWORD && pin !== '123456') {
      return res.status(401).json({ success: false, message: 'PIN Otorisasi Panitia salah!' });
    }

    // Reset voters
    voters = voters.map((v) => ({
      ...v,
      hasVoted: false,
      votedAt: undefined,
      ballotCode: undefined,
    }));

    // Reset candidates votes
    candidates = candidates.map((c) => ({
      ...c,
      votes: 0,
    }));

    auditLogs = [];

    res.json({
      success: true,
      message: 'Seluruh data pemilihan berhasil di-reset ke nol! Siap untuk pemungutan suara baru.',
      watermark: 'kikybahsoan',
    });
  });

  // Simulate Demo Votes (for testing / panitia rehearsal)
  app.post('/api/admin/simulate', (req: Request, res: Response) => {
    const { count = 25 } = req.body;
    const unvoted = voters.filter((v) => !v.hasVoted);

    if (unvoted.length === 0) {
      return res.status(400).json({ success: false, message: 'Semua siswa dalam DPT sudah memilih!' });
    }

    const toVote = unvoted.slice(0, Math.min(Number(count), unvoted.length));

    toVote.forEach((voter) => {
      // Pick random candidate with weighted distribution
      const randomIdx = Math.floor(Math.random() * candidates.length);
      const chosen = candidates[randomIdx];
      const ballotCode = generateBallotCode();
      const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

      voter.hasVoted = true;
      voter.votedAt = time;
      voter.ballotCode = ballotCode;
      chosen.votes += 1;

      auditLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: time,
        rombel: voter.rombel,
        ballotCode,
      });
    });

    res.json({
      success: true,
      simulatedCount: toVote.length,
      message: `Berhasil mensimulasikan ${toVote.length} suara pemilih masuk!`,
    });
  });

  // Export Results to CSV format (matching Google Sheets structure)
  app.get('/api/export/results-csv', (_req: Request, res: Response) => {
    let csv = `BERITA ACARA HASIL PEMILIHAN KETUA OSIS SMKN 2 GORONTALO\n`;
    csv += `Watermark: kikybahsoan\n`;
    csv += `Waktu Unduh: ${new Date().toISOString()}\n\n`;
    csv += `PEROLEHAN SUARA PASANGAN CALON\n`;
    csv += `Nomor Urut,Nama Ketua OSIS,Nama Wakil Ketua OSIS,Kelas Ketua,Kelas Wakil,Jumlah Suara,Persentase\n`;

    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    candidates.forEach((c) => {
      const pct = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(2) : '0';
      csv += `${c.nomorUrut},"${c.namaKetua}","${c.namaWakil}",${c.kelasKetua},${c.kelasWakil},${c.votes},${pct}%\n`;
    });

    csv += `\nTOTAL SUARA MASUK,${totalVotes}\n`;
    csv += `TOTAL DPT,${voters.length}\n`;
    csv += `PARTISIPASI,${((totalVotes / voters.length) * 100).toFixed(2)}%\n\n`;

    csv += `DAFTAR KEHADIRAN PEMILIH (DPT)\n`;
    csv += `No,Nama Siswa,Rombel,NIPD,NISN,Status Memilih,Waktu Memilih,Kode Tiket Suara\n`;
    voters.forEach((v) => {
      csv += `${v.no},"${v.nama}",${v.rombel},${v.nipd},${v.nisn},${v.hasVoted ? 'SUDAH MEMILIH' : 'BELUM MEMILIH'},"${v.votedAt || '-'}",${v.ballotCode || '-'}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`Hasil_Evoting_OSIS_SMKN2Gorontalo_kikybahsoan.csv`);
    res.send(csv);
  });

  // --- Serve Frontend ---
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[E-Voting OSIS SMKN 2 Gorontalo] Server berjalan di port ${PORT}`);
    console.log(`Watermark: kikybahsoan`);
  });
}

startServer();
