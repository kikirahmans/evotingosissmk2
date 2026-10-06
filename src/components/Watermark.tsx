import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface WatermarkProps {
  variant?: 'badge' | 'stamp' | 'background' | 'footer';
  className?: string;
}

export const Watermark: React.FC<WatermarkProps> = ({ variant = 'badge', className = '' }) => {
  if (variant === 'background') {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03] select-none">
        <div className="absolute inset-0 flex flex-wrap items-center justify-around gap-16 p-8 transform -rotate-12 scale-125">
          {Array.from({ length: 48 }).map((_, i) => (
            <span key={i} className="text-xl md:text-2xl font-black tracking-widest uppercase text-white">
              kikybahsoan • OSIS SMKN 2 GORONTALO
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'stamp') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold tracking-wide ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>VERIFIED AUTHENTIC: kikybahsoan</span>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 py-4 px-5 text-xs text-slate-400 border-t border-slate-800/80 bg-slate-900/40 backdrop-blur-sm ${className}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>E-Voting OSIS SMKN 2 Gorontalo • Realtime & Anti-Double Vote</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Watermark Pengembang:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono font-bold">
            kikybahsoan
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-mono shadow-sm ${className}`}>
      <span className="text-slate-500 font-sans">Watermark:</span>
      <span className="font-bold text-indigo-400 tracking-wider">kikybahsoan</span>
    </div>
  );
};
