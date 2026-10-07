export interface Voter {
  no: number;
  nama: string;
  rombel: string;
  nipd: string;
  jk: 'L' | 'P';
  nisn: string;
  hasVoted: boolean;
  votedAt?: string;
  ballotCode?: string;
  token?: string;
}

export interface Candidate {
  id: number;
  nomorUrut: number;
  namaKetua: string;
  namaWakil: string;
  kelasKetua: string;
  kelasWakil: string;
  fotoKetua: string;
  fotoWakil: string;
  fotoPasangan?: string;
  tagline: string;
  visi: string;
  misi: string[];
  programUnggulan: string[];
  warnaAksen: string;
  votes: number;
  percentage?: number;
}

export interface RombelStat {
  rombel: string;
  total: number;
  voted: number;
  remaining: number;
  percentage: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  rombel: string;
  ballotCode: string;
}

export interface ElectionOverview {
  schoolName: string;
  electionTitle: string;
  academicYear: string;
  watermark: string;
  totalDpt: number;
  totalVoted: number;
  remaining: number;
  turnoutPercentage: number;
  candidates: Candidate[];
  totalVotes: number;
  rombelStats: RombelStat[];
  discrepancy: number;
  auditLogs: AuditLog[];
  lastUpdated: string;
  googleSheetUrl?: string;
  appsScriptUrl?: string;
}
