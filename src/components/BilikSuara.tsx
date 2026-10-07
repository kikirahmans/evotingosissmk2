import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Shield,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Vote,
  LogOut,
  Clock,
  Lock,
  ChevronRight,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { Candidate, Voter } from '../types';
import { PaslonModal } from './PaslonModal';
import { Watermark } from './Watermark';
import { getDriveImageUrl, getDriveThumbnailFallback } from '../utils/driveUrl';
import { localAuthLogin, localCastVote } from '../services/storageAdapter';

interface BilikSuaraProps {
  candidates: Candidate[];
  onVoteCast: () => void;
}

export const BilikSuara: React.FC<BilikSuaraProps> = ({
  candidates,
  onVoteCast,
}) => {
  // Flow steps: 'login' | 'verified' | 'booth' | 'confirming' | 'receipt' | 'locked'
  const [step, setStep] = useState<'login' | 'verified' | 'booth' | 'receipt' | 'locked'>('login');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [viewDetailCandidate, setViewDetailCandidate] = useState<Candidate | null>(null);
  const [receiptData, setReceiptData] = useState<{
    ballotCode: string;
    votedAt: string;
    voterNama: string;
    voterRombel: string;
    candidateChosen: { nomorUrut: number; namaKetua: string; namaWakil: string };
  } | null>(null);

  // Auto logout timer after voting receipt
  const [countdown, setCountdown] = useState(8);

  // Handle countdown on receipt screen
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'receipt' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (step === 'receipt' && countdown === 0) {
      handleLogout();
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Student Login Handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Silakan masukkan NISN atau Token sekali pakai.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentVoter(data.voter);
        setStep('verified');
        setLoading(false);
        return;
      } else {
        const data = await response.json().catch(() => null);
        if (data && data.alreadyVoted) {
          setCurrentVoter(data.voter);
          setStep('locked');
          setErrorMessage(data.message);
          setLoading(false);
          return;
        } else if (data && data.message && response.status !== 404) {
          setErrorMessage(data.message);
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      // Server offline / static host fallback
    }

    // Static Host Fallback (GitHub Pages)
    const localResult = localAuthLogin(identifier.trim());
    if (localResult.success && localResult.voter) {
      setCurrentVoter(localResult.voter);
      setStep('verified');
    } else if (localResult.alreadyVoted) {
      setCurrentVoter(localResult.voter || null);
      setStep('locked');
      setErrorMessage(localResult.message || 'Hak suara sudah digunakan.');
    } else {
      setErrorMessage(localResult.message || 'NISN / Token tidak terdaftar dalam DPT.');
    }
    setLoading(false);
  };

  // Student Vote Confirmation & Submit
  const handleConfirmVote = async () => {
    if (!currentVoter || !selectedCandidate) return;

    setLoading(true);
    setShowConfirmModal(false);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: currentVoter.nisn,
          candidateId: selectedCandidate.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'],
        });

        setReceiptData({
          ballotCode: data.ballotCode,
          votedAt: data.votedAt,
          voterNama: data.voterNama,
          voterRombel: data.voterRombel,
          candidateChosen: data.candidateChosen,
        });

        setCountdown(8);
        setStep('receipt');
        setLoading(false);
        onVoteCast();
        return;
      } else {
        const data = await response.json().catch(() => null);
        if (data && data.message && response.status !== 404) {
          setErrorMessage(data.message);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      // Server offline / static host fallback
    }

    // Static Host Fallback (GitHub Pages)
    const localVoteResult = localCastVote(currentVoter.nisn, selectedCandidate.id);
    if (localVoteResult.success && localVoteResult.ballotCode && localVoteResult.candidateChosen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'],
      });

      setReceiptData({
        ballotCode: localVoteResult.ballotCode,
        votedAt: localVoteResult.votedAt || '',
        voterNama: localVoteResult.voterNama || '',
        voterRombel: localVoteResult.voterRombel || '',
        candidateChosen: localVoteResult.candidateChosen,
      });

      setCountdown(8);
      setStep('receipt');
      setLoading(false);
      onVoteCast();
    } else {
      setErrorMessage(localVoteResult.message || 'Gagal merekam suara.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setStep('login');
    setIdentifier('');
    setCurrentVoter(null);
    setSelectedCandidate(null);
    setReceiptData(null);
    setErrorMessage('');
    setShowConfirmModal(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 relative select-none">
      <Watermark variant="background" />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Vote className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide">BILIK SUARA DIGITAL</h2>
            <p className="text-[10px] text-slate-400">TPS SMKN 2 GORONTALO</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentVoter && step !== 'login' && (
            <button
              onClick={handleLogout}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-950/40 px-2 py-1 rounded-md border border-rose-800/40"
            >
              <LogOut className="w-3 h-3" />
              <span>Keluar</span>
            </button>
          )}
          <Watermark variant="badge" />
        </div>
      </div>

      {/* STEP 1: LOGIN SISWA (AUTENTIKASI) */}
      {step === 'login' && (
        <div className="flex-1 flex flex-col justify-center space-y-5 my-auto animate-in fade-in duration-300">
          <div className="text-center space-y-1.5">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-inner mb-1">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Autentikasi Pemilih OSIS
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Masukkan 10 digit NISN atau Token sekali pakai yang telah diverifikasi oleh Panitia Pemilihan.
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600/40 text-rose-200 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>NISN / Token Pemilih</span>
                <span className="text-[10px] text-indigo-400 font-normal">Contoh: 0092918927</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ketik NISN Anda..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 font-mono tracking-wider outline-none transition"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memverifikasi DPT...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Verifikasi & Buka Bilik Suara</span>
                </>
              )}
            </button>
          </form>

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px] text-slate-400">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center">
              <Lock className="w-3.5 h-3.5 text-emerald-400 mb-1" />
              <span>1 Siswa 1 Suara</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center">
              <Shield className="w-3.5 h-3.5 text-indigo-400 mb-1" />
              <span>Kerahasiaan Sah</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mb-1" />
              <span>Anti-Manipulasi</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: VERIFIED IDENTITAS SISWA */}
      {step === 'verified' && currentVoter && (
        <div className="flex-1 flex flex-col justify-center space-y-5 my-auto animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Identitas Pemilih Terverifikasi
            </h3>
            <p className="text-xs text-slate-400">
              Silakan pastikan data berikut adalah identitas Anda sebelum masuk bilik suara.
            </p>
          </div>

          {/* Student Voter Badge Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
              <span>DPT NO: #{currentVoter.no}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold">
                HAK SUARA AKTIF
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center font-bold text-lg text-indigo-300">
                {currentVoter.nama.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {currentVoter.nama}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-slate-800 font-semibold text-cyan-300">
                    {currentVoter.rombel}
                  </span>
                  <span>JK: {currentVoter.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-900">
              <div>
                <span className="text-slate-500 block">NISN</span>
                <span className="text-slate-200 font-bold">{currentVoter.nisn}</span>
              </div>
              <div>
                <span className="text-slate-500 block">NIPD</span>
                <span className="text-slate-200 font-bold">{currentVoter.nipd || '-'}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/30 text-[11px] text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Perhatian: Setelah Anda menekan tombol di bawah dan mengonfirmasi pilihan, token hak suara akan hangus permanen dan tidak bisa memilih lagi.
            </span>
          </div>

          <button
            onClick={() => setStep('booth')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Mulai Memilih Paslon</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: BILIK SUARA (PILIH PASLON) */}
      {step === 'booth' && (
        <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Pemilih:</span>
              <span className="font-bold text-white">{currentVoter?.nama}</span>
              <span className="text-indigo-400 font-mono text-[11px] ml-1.5">({currentVoter?.rombel})</span>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-semibold">
                1 PILIHAN
              </span>
            </div>
          </div>

          <div className="text-center">
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              Surat Suara Digital Paslon OSIS
            </h3>
            <p className="text-[11px] text-slate-400">
              Pilih salah satu nomor pasangan calon ketua dan wakil ketua OSIS di bawah ini.
            </p>
          </div>

          {/* Candidate Ballot Cards */}
          <div className="space-y-3.5">
            {candidates.map((c) => {
              const isSelected = selectedCandidate?.id === c.id;

              return (
                <div
                  key={c.id}
                  className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/50 shadow-xl'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                  }`}
                >
                  {/* Paslon Header Strip */}
                  <div className={`px-3 py-1.5 bg-gradient-to-r ${c.warnaAksen} flex items-center justify-between text-white`}>
                    <span className="text-xs font-black tracking-wider">
                      NOMOR URUT 0{c.nomorUrut}
                    </span>
                    <span className="text-[10px] font-medium opacity-90 truncate max-w-[180px]">
                      {c.tagline}
                    </span>
                  </div>

                  {/* Paslon Body */}
                  <div className="p-3.5 space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Photo: Pasangan Calon Foto Resmi */}
                      <div className="relative shrink-0 w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-slate-800 border-2 border-indigo-500/30 shadow-md">
                        <img
                          src={getDriveImageUrl(c.fotoPasangan || c.fotoKetua)}
                          alt={`Pasangan Calon No ${c.nomorUrut}`}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const fallbackUrl = getDriveThumbnailFallback(c.fotoPasangan || c.fotoKetua);
                            if (target.src !== fallbackUrl) {
                              target.src = fallbackUrl;
                            } else {
                              target.src = `https://ui-avatars.com/api/?name=Paslon+${c.nomorUrut}&background=312e81&color=fff&size=250`;
                            }
                          }}
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-slate-950/85 text-[9px] font-bold text-center text-cyan-300 py-0.5 tracking-wider">
                          PASLON 0{c.nomorUrut}
                        </span>
                      </div>

                      {/* Candidate Names */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-extrabold text-white truncate">
                          Ketua: <span className="text-indigo-300">{c.namaKetua}</span>
                        </div>
                        <div className="text-[12px] font-extrabold text-white truncate mt-0.5">
                          Wakil: <span className="text-cyan-300">{c.namaWakil}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 flex flex-wrap gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                            {c.kelasKetua}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                            {c.kelasWakil}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visi Ringkasan */}
                    <p className="text-[11px] text-slate-300 line-clamp-2 italic bg-slate-950/50 p-2 rounded-lg border border-slate-900">
                      "{c.visi}"
                    </p>

                    {/* Action buttons: Detail vs Coblos */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewDetailCandidate(c)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        Visi & Misi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCandidate(c);
                          setShowConfirmModal(true);
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>PILIH PASLON 0{c.nomorUrut}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL (Bilik Suara Digital: Konfirmasi ulang sebelum suara disimpan) */}
      {showConfirmModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-white">
                Konfirmasi Pilihan Suara
              </h4>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin memberikan suara kepada paslon berikut?
              </p>
            </div>

            {/* Candidate Card Review */}
            <div className={`p-4 rounded-2xl bg-gradient-to-r ${selectedCandidate.warnaAksen} text-white shadow-inner`}>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 block">
                Pilihan Anda:
              </span>
              <div className="text-2xl font-black my-1">
                PASLON 0{selectedCandidate.nomorUrut}
              </div>
              <div className="text-xs font-semibold drop-shadow-sm">
                {selectedCandidate.namaKetua} & {selectedCandidate.namaWakil}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-rose-300">
              ⚠️ Pilihan tidak dapat dibatalkan atau diubah. Akun Anda akan langsung dikunci permanen.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Pikir Ulang
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition"
              >
                {loading ? 'Mengunci...' : 'Ya, Kunci Suara!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: DIGITAL BALLOT RECEIPT (BUKTI SUARA SAH) */}
      {step === 'receipt' && receiptData && (
        <div className="flex-1 flex flex-col justify-center space-y-4 my-auto animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-1 shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">
              Suara Anda Sah Tercatat!
            </h3>
            <p className="text-xs text-slate-300">
              Terima kasih telah berpartisipasi dalam Pemilihan Ketua OSIS SMKN 2 Gorontalo.
            </p>
          </div>

          {/* Official Digital Ballot Receipt Card */}
          <div className="relative rounded-2xl bg-slate-900 border border-emerald-500/40 p-4 shadow-2xl space-y-3.5 overflow-hidden">
            {/* Watermark Stamp */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>BUKTI RESMI TIKET SUARA</span>
              </div>
              <Watermark variant="stamp" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Kode Unik Suara</span>
                <span className="font-mono font-bold text-indigo-300">{receiptData.ballotCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Pemilih</span>
                <span className="font-semibold text-white">{receiptData.voterNama}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Rombel</span>
                <span className="font-semibold text-white">{receiptData.voterRombel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Waktu Rekam</span>
                <span className="text-slate-300 font-mono text-[11px]">{receiptData.votedAt}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status Token</span>
                <span className="font-bold text-rose-400">HANGUS / TERKUNCI (SELESAI)</span>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl text-center text-[11px] text-emerald-300">
              Hak suara Anda telah resmi dikunci dan dimasukkan ke dalam tabulasi database realtime.
            </div>
          </div>

          {/* Auto Logout Countdown */}
          <div className="text-center space-y-2 pt-2">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Otomatis keluar dalam <strong className="text-white font-mono">{countdown}</strong> detik</span>
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Selesai & Keluar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: LOCKED / ALREADY VOTED STATE */}
      {step === 'locked' && (
        <div className="flex-1 flex flex-col justify-center space-y-4 my-auto animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-1">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-base sm:text-lg font-black text-rose-400">
              Hak Suara Telah Digunakan
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              {errorMessage || 'Sistem mencatat Anda sudah menggunakan hak suara sebelumnya.'}
            </p>
          </div>

          {currentVoter && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-rose-900/40 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Nama Siswa</span>
                <span className="font-bold text-white">{currentVoter.nama}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">NISN</span>
                <span className="font-mono text-slate-300">{currentVoter.nisn}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Kelas / Rombel</span>
                <span className="font-semibold text-slate-300">{currentVoter.rombel}</span>
              </div>
              {currentVoter.votedAt && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Waktu Memilih</span>
                  <span className="font-mono text-slate-300">{currentVoter.votedAt}</span>
                </div>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-center">
            🔒 Demi integritas dan transparansi pemilihan, tidak ada siswa yang diperbolehkan memilih lebih dari 1 kali.
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Kembali ke Halaman Login
          </button>
        </div>
      )}

      {/* FOOTER WATERMARK & TPS INFO */}
      <div className="pt-4 mt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
        <span>SMK Negeri 2 Gorontalo</span>
        <span className="font-mono">Watermark: kikybahsoan</span>
      </div>

      {/* CANDIDATE DETAIL MODAL */}
      <PaslonModal
        candidate={viewDetailCandidate}
        onClose={() => setViewDetailCandidate(null)}
        onSelect={(c) => {
          setSelectedCandidate(c);
          setShowConfirmModal(true);
        }}
      />
    </div>
  );
};
