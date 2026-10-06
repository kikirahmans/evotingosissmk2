import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Watermark } from './Watermark';

interface PanitiaLockGateProps {
  onUnlock: () => void;
  onBackToBooth: () => void;
  targetPageName: string;
}

export const PanitiaLockGate: React.FC<PanitiaLockGateProps> = ({
  onUnlock,
  onBackToBooth,
  targetPageName,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Masukkan kata sandi panitia.');
      return;
    }

    setLoading(true);
    setError('');

    // Check password on server or directly
    try {
      const res = await fetch('/api/auth/panitia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onUnlock();
      } else {
        // Direct fallback check
        if (password.trim() === 'panitia11221') {
          onUnlock();
        } else {
          setError(data.message || 'Kata sandi panitia salah! Periksa kembali sandi Anda.');
        }
      }
    } catch {
      if (password.trim() === 'panitia11221') {
        onUnlock();
      } else {
        setError('Kata sandi panitia salah! Hubungi ketua panitia pemilihan.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 my-auto animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-5">
        {/* Glowing badge */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            AKSES TERKUNCI • KHUSUS PANITIA
          </span>
          <h3 className="text-xl font-black text-white tracking-tight">
            Verifikasi Akses {targetPageName}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Halaman Panitia dan Dashboard Real-Time diproteksi untuk menjaga kerahasiaan dan integritas pemilihan OSIS SMKN 2 Gorontalo.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600/40 text-rose-200 text-xs flex items-center justify-center gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300 block">
              Kata Sandi Rahasia Panitia
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi panitia..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 font-mono tracking-wider outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Memverifikasi Sandi...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Buka Kunci Akses Panitia</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
          <button
            onClick={onBackToBooth}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Bilik Suara</span>
          </button>
          <Watermark variant="badge" />
        </div>
      </div>
    </div>
  );
};
