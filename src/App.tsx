import React, { useState, useEffect, useCallback } from 'react';
import { PhoneContainer } from './components/PhoneContainer';
import { BilikSuara } from './components/BilikSuara';
import { DashboardRealtime } from './components/DashboardRealtime';
import { PanitiaSpreadsheet } from './components/PanitiaSpreadsheet';
import { PanitiaLockGate } from './components/PanitiaLockGate';
import { Watermark } from './components/Watermark';
import { Candidate, ElectionOverview } from './types';
import { INITIAL_CANDIDATES } from './data/initialCandidates';
import { getLocalOverview } from './services/storageAdapter';

export default function App() {
  const [activeTab, setActiveTab] = useState<'bilik' | 'dashboard' | 'panitia'>('bilik');
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [overview, setOverview] = useState<ElectionOverview | null>(null);

  // Panitia Lock State (strictly protects Dashboard & Panitia pages with password: panitia11221)
  const [isPanitiaUnlocked, setIsPanitiaUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('panitia_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const handleUnlockPanitia = () => {
    setIsPanitiaUnlocked(true);
    try {
      sessionStorage.setItem('panitia_unlocked', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  const handleLockPanitia = () => {
    setIsPanitiaUnlocked(false);
    try {
      sessionStorage.removeItem('panitia_unlocked');
    } catch {
      // Ignore storage errors
    }
    setActiveTab('bilik');
  };

  // Fetch Candidates
  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch('/api/candidates');
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && Array.isArray(data.candidates)) {
          setCandidates(data.candidates);
          return;
        }
      }
    } catch {
      // Static host fallback
    }
    const local = getLocalOverview();
    setCandidates(local.candidates);
  }, []);

  // Fetch Overview and Results
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/results');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        if (data.candidates) {
          setCandidates(data.candidates);
        }
        return;
      }
    } catch {
      // Static host fallback
    }
    const local = getLocalOverview();
    setOverview(local);
    setCandidates(local.candidates);
  }, []);

  // Initial Load
  useEffect(() => {
    fetchCandidates();
    fetchOverview();
  }, [fetchCandidates, fetchOverview]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Watermark variant="background" />

      <PhoneContainer
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        isPanitiaUnlocked={isPanitiaUnlocked}
        onLockPanitia={handleLockPanitia}
      >
        {activeTab === 'bilik' && (
          <BilikSuara
            candidates={candidates}
            onVoteCast={() => {
              fetchOverview();
              fetchCandidates();
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          !isPanitiaUnlocked ? (
            <PanitiaLockGate
              targetPageName="Dashboard Real-Time"
              onUnlock={handleUnlockPanitia}
              onBackToBooth={() => setActiveTab('bilik')}
            />
          ) : (
            <DashboardRealtime
              overview={overview}
              onRefresh={() => {
                fetchOverview();
                fetchCandidates();
              }}
            />
          )
        )}

        {activeTab === 'panitia' && (
          !isPanitiaUnlocked ? (
            <PanitiaLockGate
              targetPageName="Halaman Panitia"
              onUnlock={handleUnlockPanitia}
              onBackToBooth={() => setActiveTab('bilik')}
            />
          ) : (
            <PanitiaSpreadsheet
              candidates={candidates}
              onCandidatesUpdated={() => {
                fetchCandidates();
                fetchOverview();
              }}
              onRefresh={() => {
                fetchOverview();
                fetchCandidates();
              }}
            />
          )
        )}
      </PhoneContainer>

      {/* Global Footer with Watermark */}
      <Watermark variant="footer" />
    </div>
  );
}
