import React from 'react';
import { Candidate } from '../types';
import { X, CheckCircle2, Award, Sparkles, Target, Users } from 'lucide-react';
import { Watermark } from './Watermark';
import { getDriveImageUrl, getDriveThumbnailFallback } from '../utils/driveUrl';

interface PaslonModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onSelect: (candidate: Candidate) => void;
}

export const PaslonModal: React.FC<PaslonModalProps> = ({
  candidate,
  onClose,
  onSelect,
}) => {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with Paslon Number Banner */}
        <div className={`p-4 bg-gradient-to-r ${candidate.warnaAksen} relative flex items-center justify-between text-white`}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl shadow-inner">
              0{candidate.nomorUrut}
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 block">
                Pasangan Calon Ketua & Wakil OSIS
              </span>
              <h3 className="font-bold text-lg leading-tight drop-shadow-sm">
                Paslon Nomor 0{candidate.nomorUrut}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-200">
          {/* Candidate Official Couple Photo Card */}
          <div className="flex flex-col items-center bg-slate-950/70 p-4 rounded-3xl border border-slate-800">
            <div className="relative w-full max-w-[280px] h-60 sm:h-72 rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-500/40 shadow-xl">
              <img
                src={getDriveImageUrl(candidate.fotoPasangan || candidate.fotoKetua)}
                alt={`Pasangan Calon 0${candidate.nomorUrut}`}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fallback = getDriveThumbnailFallback(candidate.fotoPasangan || candidate.fotoKetua);
                  if (target.src !== fallback) {
                    target.src = fallback;
                  } else {
                    target.src = `https://ui-avatars.com/api/?name=Paslon+0${candidate.nomorUrut}&background=312e81&color=fff&size=300`;
                  }
                }}
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-3 pt-6 text-center">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider">
                  Foto Resmi Pasangan Calon
                </span>
              </div>
            </div>

            {/* Names & Classes */}
            <div className="mt-3 text-center space-y-1 w-full">
              <h4 className="font-black text-base text-white">
                {candidate.namaKetua}
              </h4>
              <p className="text-xs text-indigo-300 font-bold">
                Calon Ketua OSIS ({candidate.kelasKetua})
              </p>
              <div className="text-slate-500 text-xs font-bold">&</div>
              <h4 className="font-black text-base text-white">
                {candidate.namaWakil}
              </h4>
              <p className="text-xs text-cyan-300 font-bold">
                Calon Wakil Ketua OSIS ({candidate.kelasWakil})
              </p>
            </div>
          </div>

          {/* Slogan / Tagline */}
          <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/50 border border-indigo-500/20 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Slogan Paslon
            </span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-100 italic mt-0.5">
              "{candidate.tagline}"
            </p>
          </div>

          {/* Visi */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-indigo-400">
              <Target className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white">Visi Calon</h4>
            </div>
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs sm:text-sm leading-relaxed text-slate-300">
              {candidate.visi}
            </div>
          </div>

          {/* Misi */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Award className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white">Misi Calon</h4>
            </div>
            <ul className="space-y-2 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              {candidate.misi.map((m, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Program Kerja Unggulan */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <Users className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white">Program Kerja Unggulan</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {candidate.programUnggulan.map((prog, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-medium text-white">{prog}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Watermark variant="badge" />
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onSelect(candidate);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r ${candidate.warnaAksen} hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Pilih Paslon Nomor 0{candidate.nomorUrut}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
