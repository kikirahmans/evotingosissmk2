import { Candidate, Voter } from '../types';

export interface SyncVotesResult {
  success: boolean;
  message: string;
  totalVotesCount: number;
  votesPerCandidate: Record<number, number>;
  votersUpdatedCount: number;
}

/**
 * Intelligent parser that reads any Google Spreadsheet CSV:
 * - Tab "Log_Suara_Masuk" (individual ballots/tickets)
 * - Tab "Hasil_Suara" (tabulated results summary)
 * - Tab "Form Responses" / Google Form responses
 * - Tab "Daftar_Hadir_DPT" (attendance list)
 */
export function syncVotesFromCSV(
  csvText: string,
  candidates: Candidate[],
  voters: Voter[],
  auditLogs: Array<{ id: string; timestamp: string; rombel: string; ballotCode: string }>
): SyncVotesResult {
  if (!csvText || typeof csvText !== 'string') {
    return {
      success: false,
      message: 'Konten CSV spreadsheet kosong.',
      totalVotesCount: 0,
      votesPerCandidate: {},
      votersUpdatedCount: 0,
    };
  }

  const rawLines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return {
      success: false,
      message: 'Tidak ada baris data dalam spreadsheet.',
      totalVotesCount: 0,
      votesPerCandidate: {},
      votersUpdatedCount: 0,
    };
  }

  // Parse lines into columns handling CSV commas and quotes
  const rows: string[][] = rawLines.map((line) => {
    const cols: string[] = [];
    let inQuotes = false;
    let cur = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur.trim());
    return cols;
  });

  const votesPerCandidate: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let votersMarkedCount = 0;
  let detectedType: 'log' | 'summary' | 'mixed' = 'log';

  // Check if there is a summary table format ("Hasil_Suara" with candidate rows and vote counts)
  let foundSummaryRows = false;
  for (const row of rows) {
    const rowStr = row.join(' ').toLowerCase();
    // Look for rows like: "1, Muhamad Rizki, ..., 45" or "01, ..., 45, 52%"
    for (const c of candidates) {
      const noStr = String(c.nomorUrut);
      const paddedNo = `0${c.nomorUrut}`;
      const ketuaLast = c.namaKetua.split(' ').slice(-1)[0].toLowerCase();
      if (
        (rowStr.includes(`paslon ${noStr}`) ||
          rowStr.includes(`paslon ${paddedNo}`) ||
          rowStr.includes(`no. ${paddedNo}`) ||
          rowStr.includes(`no. ${noStr}`) ||
          (row[0] && (row[0] === noStr || row[0] === paddedNo))) &&
        (rowStr.includes(c.namaKetua.toLowerCase()) || rowStr.includes(ketuaLast))
      ) {
        // Look for number column representing votes
        for (let j = row.length - 1; j >= 0; j--) {
          const val = row[j].replace(/[^0-9]/g, '');
          if (val && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1000) {
            // Check if not percentage
            if (!row[j].includes('%')) {
              votesPerCandidate[c.nomorUrut] = Number(val);
              foundSummaryRows = true;
              break;
            }
          }
        }
      }
    }
  }

  if (foundSummaryRows && Object.values(votesPerCandidate).some((v) => v > 0)) {
    detectedType = 'summary';
    // Update candidates
    candidates.forEach((c) => {
      if (votesPerCandidate[c.nomorUrut] !== undefined) {
        c.votes = votesPerCandidate[c.nomorUrut];
      }
    });

    const totalVotes = Object.values(votesPerCandidate).reduce((a, b) => a + b, 0);
    return {
      success: true,
      message: `Berhasil menarik rekapitulasi ${totalVotes} suara dari tabel Hasil Suara Spreadsheet!`,
      totalVotesCount: totalVotes,
      votesPerCandidate,
      votersUpdatedCount: 0,
    };
  }

  // Otherwise, parse as Log of Votes / Ballots (Log_Suara_Masuk)
  // Each row represents 1 incoming student ballot!
  let voteLogCount = 0;
  // Reset candidate votes to recalculate accurately from the log
  votesPerCandidate[1] = 0;
  votesPerCandidate[2] = 0;
  votesPerCandidate[3] = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowStr = row.join(' ').toLowerCase();

    // Skip header rows
    if (
      rowStr.includes('timestamp') ||
      rowStr.includes('kode tiket') ||
      rowStr.includes('rekapitulasi') ||
      rowStr.includes('daftar kehadiran') ||
      rowStr.includes('nama calon ketua')
    ) {
      continue;
    }

    // Detect candidate choice in this row
    let chosenNo = 0;
    if (
      rowStr.includes('paslon 01') ||
      rowStr.includes('paslon 1') ||
      rowStr.includes('nomor 1') ||
      rowStr.includes('no 1') ||
      rowStr.includes('rizki') ||
      rowStr.includes('lamusu')
    ) {
      chosenNo = 1;
    } else if (
      rowStr.includes('paslon 02') ||
      rowStr.includes('paslon 2') ||
      rowStr.includes('nomor 2') ||
      rowStr.includes('no 2') ||
      rowStr.includes('fathir') ||
      rowStr.includes('kondengis')
    ) {
      chosenNo = 2;
    } else if (
      rowStr.includes('paslon 03') ||
      rowStr.includes('paslon 3') ||
      rowStr.includes('nomor 3') ||
      rowStr.includes('no 3') ||
      rowStr.includes('rasya') ||
      rowStr.includes('hamzah')
    ) {
      chosenNo = 3;
    }

    if (chosenNo > 0) {
      votesPerCandidate[chosenNo] += 1;
      voteLogCount += 1;

      // Extract timestamp, ticket code, and voter NISN if present
      const timeVal = row[0] || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
      const ballotCode = row[1] && row[1].startsWith('OSIS') ? row[1] : `OSIS2-LOG-${i}`;
      let voterNisn = '';

      // Look for 10-digit NISN or matching voter in row
      for (const col of row) {
        const cleanCol = col.trim();
        const found = voters.find(
          (v) =>
            v.nisn === cleanCol ||
            v.nama.toLowerCase() === cleanCol.toLowerCase() ||
            (cleanCol.length >= 8 && v.nisn.includes(cleanCol))
        );
        if (found) {
          voterNisn = found.nisn;
          if (!found.hasVoted) {
            found.hasVoted = true;
            found.votedAt = timeVal;
            found.ballotCode = ballotCode;
            votersMarkedCount += 1;
          }
          break;
        }
      }

      // Add to audit logs if not duplicate
      if (!auditLogs.some((l) => l.ballotCode === ballotCode)) {
        auditLogs.unshift({
          id: `log-${i}-${Date.now()}`,
          timestamp: timeVal,
          rombel: row[4] || 'SMKN 2',
          ballotCode,
        });
      }
    }
  }

  // Apply calculated votes to candidates
  candidates.forEach((c) => {
    if (votesPerCandidate[c.nomorUrut] !== undefined) {
      c.votes = votesPerCandidate[c.nomorUrut];
    }
  });

  const totalVotes = Object.values(votesPerCandidate).reduce((a, b) => a + b, 0);

  if (totalVotes === 0) {
    return {
      success: false,
      message:
        'Tidak ditemukan baris suara yang cocok di sheet ini. Pastikan sheet berisi log suara atau perolehan paslon.',
      totalVotesCount: 0,
      votesPerCandidate,
      votersUpdatedCount: 0,
    };
  }

  return {
    success: true,
    message: `Berhasil menarik ${totalVotes} suara pemilih dari spreadsheet! (Paslon 01: ${votesPerCandidate[1]}, Paslon 02: ${votesPerCandidate[2]}, Paslon 03: ${votesPerCandidate[3]})`,
    totalVotesCount: totalVotes,
    votesPerCandidate,
    votersUpdatedCount: votersMarkedCount,
  };
}
