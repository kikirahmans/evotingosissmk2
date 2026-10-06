import React, { useState } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal, Clock, Lock, KeyRound } from 'lucide-react';

interface PhoneContainerProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isPanitiaUnlocked?: boolean;
  onLockPanitia?: () => void;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({
  children,
  activeTab,
  onTabChange,
  isPanitiaUnlocked = false,
  onLockPanitia,
}) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Time formatted in Gorontalo / WITA (UTC+8)
  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Top Utility Bar for Switching Views & Mode */}
      <header className="w-full bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & School Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 text-xs tracking-tighter">
                SMK2
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm md:text-base tracking-tight text-white">
                  E-Voting OSIS SMKN 2 Gorontalo
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  kikybahsoan
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Pemilihan Ketua & Wakil Ketua OSIS</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onTabChange('bilik')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'bilik'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Bilik Suara (Siswa)</span>
            </button>

            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {!isPanitiaUnlocked && <Lock className="w-3 h-3 text-amber-400" />}
              <span>Dashboard Real-Time</span>
            </button>

            <button
              onClick={() => onTabChange('panitia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'panitia'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {!isPanitiaUnlocked && <Lock className="w-3 h-3 text-amber-400" />}
              <span>Panitia & Spreadsheet</span>
            </button>

            {isPanitiaUnlocked && onLockPanitia && (
              <button
                onClick={onLockPanitia}
                title="Kunci Akses Panitia (Logout)"
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 border border-rose-900/40 flex items-center gap-1 transition"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Kunci</span>
              </button>
            )}
          </div>

          {/* Frame Toggle (Desktop only) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsPhoneFrame(true)}
              title="Mode Tampilan Ponsel (Mobile Frame)"
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition ${
                isPhoneFrame
                  ? 'bg-slate-800 text-indigo-400 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Frame Ponsel</span>
            </button>
            <button
              onClick={() => setIsPhoneFrame(false)}
              title="Mode Responsif Layar Penuh"
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition ${
                !isPhoneFrame
                  ? 'bg-slate-800 text-indigo-400 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Layar Penuh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 relative z-10">
        {/* If isPhoneFrame is true and tab is bilik suara, wrap in realistic smartphone mockup on desktop */}
        {isPhoneFrame && activeTab === 'bilik' ? (
          <div className="w-full flex flex-col items-center justify-center my-auto py-2">
            {/* Phone Bezel */}
            <div className="relative w-full max-w-[430px] rounded-[48px] bg-slate-900 border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(79,70,229,0.15)] overflow-hidden flex flex-col min-h-[780px] max-h-[92vh]">
              {/* Phone Speaker & Notch Island */}
              <div className="bg-slate-900 pt-2 pb-1 px-7 flex items-center justify-between text-xs text-slate-300 select-none z-30">
                <span className="font-semibold text-[13px]">{currentTime}</span>
                <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800 mr-2"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-950 border border-indigo-500/50"></div>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Phone Screen Scrollable Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col relative custom-scrollbar">
                {children}
              </div>

              {/* Phone Bottom Home Bar */}
              <div className="bg-slate-950 py-2.5 flex justify-center items-center select-none border-t border-slate-900">
                <div className="w-32 h-1 bg-slate-700/80 rounded-full"></div>
              </div>
            </div>

            {/* Mobile frame indicator caption */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simulasi Layar Ponsel Siswa • SMKN 2 Gorontalo</span>
            </div>
          </div>
        ) : (
          /* Fullscreen / Desktop Layout */
          <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
