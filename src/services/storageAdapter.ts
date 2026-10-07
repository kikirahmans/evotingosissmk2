import { Voter, Candidate, ElectionOverview } from '../types';
import { INITIAL_VOTERS } from '../data/initialVoters';
import { INITIAL_CANDIDATES } from '../data/initialCandidates';
import { syncVotesFromCSV } from '../utils/spreadsheetSync';

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbw1GCnJlUTkrKJFObrxA6OKyiaQoFG6epF86M_nWGJE1a1KHMAzViwGuwST-QYRnWIP/exec';

const STORAGE_KEYS = {
  VOTERS: 'evoting_voters_smkn2',
  CANDIDATES: 'evoting_candidates_smkn2',
  AUDIT_LOGS: 'evoting_audit_logs_smkn2',
  APPS_SCRIPT_URL: 'evoting_appscript_url',
};

// Check if running on static host (like GitHub Pages) where /api/health is unavailable
let isStaticMode: boolean | null = null;

export async function checkServerAvailability(): Promise<boolean> {
  if (isStaticMode !== null) return !isStaticMode;
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      isStaticMode = false;
      return true;
    }
  } catch {
    // Static mode
  }
  isStaticMode = true;
  return false;
}

// Client-Side Data Store for GitHub Pages
function getLocalVoters(): Voter[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.VOTERS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return JSON.parse(JSON.stringify(INITIAL_VOTERS));
}

function saveLocalVoters(voters: Voter[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.VOTERS, JSON.stringify(voters));
  } catch {}
}

function getLocalCandidates(): Candidate[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
    if (saved) return JSON.parse(saved);
  } catch {}
  return JSON.parse(JSON.stringify(INITIAL_CANDIDATES));
}

function saveLocalCandidates(candidates: Candidate[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
  } catch {}
}

function getLocalAuditLogs(): any[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveLocalAuditLogs(logs: any[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  } catch {}
}

export function getAppsScriptUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL);
    if (saved) return saved;
  } catch {}
  return DEFAULT_APPS_SCRIPT_URL;
}

export function saveAppsScriptUrl(url: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, url);
  } catch {}
}

// Fallback direct vote pusher to Google Apps Script on GitHub Pages
export async function pushVoteDirectToAppsScript(payload: any) {
  const url = getAppsScriptUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors', // Google Apps Script handles no-cors post from browser on GitHub Pages
    });
  } catch (err: any) {
    console.warn('Google Apps Script direct post:', err.message);
  }
}

// Client-side Local API Fallbacks
export function localAuthLogin(identifier: string) {
  const cleanId = identifier.trim().toUpperCase();
  const voters = getLocalVoters();

  const voter = voters.find((v) => {
    const matchNisn = v.nisn === cleanId;
    const matchToken = v.token && v.token.toUpperCase() === cleanId;
    const matchNipd = v.nipd === cleanId;
    return matchNisn || matchToken || matchNipd;
  });

  if (!voter) {
    return {
      success: false,
      message: 'NISN / Token tidak terdaftar dalam Daftar Pemilih Tetap (DPT) SMKN 2 Gorontalo.',
    };
  }

  if (voter.hasVoted) {
    return {
      success: false,
      alreadyVoted: true,
      voter,
      message: `Hak suara atas nama ${voter.nama} (${voter.nisn}) sudah digunakan pada ${voter.votedAt || 'sesi sebelumnya'} dan akun telah terkunci secara permanen.`,
    };
  }

  return {
    success: true,
    alreadyVoted: false,
    voter,
  };
}

export type LocalVoteResult =
  | {
      success: true;
      message: string;
      ballotCode: string;
      votedAt: string;
      voterNama: string;
      voterRombel: string;
      candidateChosen: {
        nomorUrut: number;
        namaKetua: string;
        namaWakil: string;
      };
      watermark: string;
    }
  | {
      success: false;
      message: string;
      ballotCode?: undefined;
      votedAt?: undefined;
      voterNama?: undefined;
      voterRombel?: undefined;
      candidateChosen?: undefined;
      watermark?: undefined;
    };

export function localCastVote(nisn: string, candidateId: number): LocalVoteResult {
  const voters = getLocalVoters();
  const candidates = getLocalCandidates();
  const auditLogs = getLocalAuditLogs();

  const cleanNisn = nisn.trim();
  const voter = voters.find((v) => v.nisn === cleanNisn || (v.token && v.token.toUpperCase() === cleanNisn.toUpperCase()));

  if (!voter) {
    return { success: false, message: 'Pemilih tidak ditemukan dalam DPT.' };
  }

  if (voter.hasVoted) {
    return {
      success: false,
      message: `PERINGATAN SISTEM: Siswa ${voter.nama} sudah pernah memilih! Suara tidak dapat diduplikasi.`,
    };
  }

  const candidate = candidates.find((c) => c.id === candidateId || c.nomorUrut === candidateId);
  if (!candidate) {
    return { success: false, message: 'Paslon pilihan tidak valid.' };
  }

  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  const ballotCode = `OSIS2-${time}-${rand}`;

  const votedTime = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  voter.hasVoted = true;
  voter.votedAt = votedTime;
  voter.ballotCode = ballotCode;
  candidate.votes += 1;

  auditLogs.unshift({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: votedTime,
    rombel: voter.rombel,
    ballotCode,
  });
  if (auditLogs.length > 100) auditLogs.pop();

  saveLocalVoters(voters);
  saveLocalCandidates(candidates);
  saveLocalAuditLogs(auditLogs);

  // Directly send to Google Apps Script Web App
  pushVoteDirectToAppsScript({
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

  return {
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
  };
}

export function getLocalOverview(): ElectionOverview {
  const voters = getLocalVoters();
  const candidates = getLocalCandidates();
  const auditLogs = getLocalAuditLogs();

  const totalDpt = voters.length;
  const totalVoted = voters.filter((v) => v.hasVoted).length;
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

  const candidateResults = candidates.map((c) => {
    const percentage = totalVotes > 0 ? Number(((c.votes / totalVotes) * 100).toFixed(1)) : 0;
    return { ...c, percentage };
  });

  const rombelMap: Record<string, { total: number; voted: number }> = {};
  voters.forEach((v) => {
    if (!rombelMap[v.rombel]) rombelMap[v.rombel] = { total: 0, voted: 0 };
    rombelMap[v.rombel].total += 1;
    if (v.hasVoted) rombelMap[v.rombel].voted += 1;
  });

  const rombelStats = Object.keys(rombelMap).map((rombel) => {
    const data = rombelMap[rombel];
    const percentage = data.total > 0 ? Number(((data.voted / data.total) * 100).toFixed(1)) : 0;
    return {
      rombel,
      total: data.total,
      voted: data.voted,
      remaining: data.total - data.voted,
      percentage,
    };
  });

  return {
    schoolName: 'SMK NEGERI 2 GORONTALO',
    electionTitle: 'PEMILIHAN KETUA & WAKIL KETUA OSIS',
    academicYear: 'PERIODE 2026/2027',
    watermark: 'kikybahsoan',
    totalDpt,
    totalVoted,
    remaining: totalDpt - totalVoted,
    turnoutPercentage: totalDpt > 0 ? Number(((totalVoted / totalDpt) * 100).toFixed(1)) : 0,
    candidates: candidateResults,
    totalVotes,
    rombelStats,
    discrepancy: 0,
    auditLogs: auditLogs.slice(0, 15),
    lastUpdated: new Date().toISOString(),
  };
}

export function localResetElection() {
  const voters = getLocalVoters().map((v) => ({
    ...v,
    hasVoted: false,
    votedAt: undefined,
    ballotCode: undefined,
  }));
  const candidates = getLocalCandidates().map((c) => ({
    ...c,
    votes: 0,
  }));

  saveLocalVoters(voters);
  saveLocalCandidates(candidates);
  saveLocalAuditLogs([]);
}

export function syncVotesLocalFromCSV(csvText: string) {
  const voters = getLocalVoters();
  const candidates = getLocalCandidates();
  const auditLogs = getLocalAuditLogs();

  const result = syncVotesFromCSV(csvText, candidates, voters, auditLogs);
  if (result.success) {
    saveLocalVoters(voters);
    saveLocalCandidates(candidates);
    saveLocalAuditLogs(auditLogs);
  }
  return result;
}

export function setLocalCandidateVotes(v1: number, v2: number, v3: number) {
  const voters = getLocalVoters();
  const candidates = getLocalCandidates();

  if (candidates.length >= 3) {
    candidates[0].votes = v1;
    candidates[1].votes = v2;
    candidates[2].votes = v3;
  }

  const total = v1 + v2 + v3;
  voters.forEach((v, idx) => {
    if (idx < total) {
      if (!v.hasVoted) {
        v.hasVoted = true;
        v.votedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
        v.ballotCode = `OSIS2-SYNC-${v.nisn.slice(-4)}`;
      }
    } else {
      v.hasVoted = false;
      v.votedAt = undefined;
      v.ballotCode = undefined;
    }
  });

  saveLocalVoters(voters);
  saveLocalCandidates(candidates);
}
