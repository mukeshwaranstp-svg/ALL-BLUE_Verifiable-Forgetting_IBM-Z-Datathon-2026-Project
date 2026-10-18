import React, { useEffect, useState } from 'react';
import { BackendConnectionStatus } from '../types';

interface TopBarProps {
  activeView: string;
  onOpenMenu: () => void;
  inFlightJobsCount: number;
  connectionStatus: BackendConnectionStatus;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onOpenMenu,
  inFlightJobsCount,
  connectionStatus,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('2026-10-24 14:32:08 UTC');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = now.toTimeString().slice(0, 8);
      setCurrentTime(`${datePart} ${timePart} UTC`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (view: string) => {
    switch (view) {
      case 'dashboard':
        return 'Enclave Dashboard';
      case 'deletion-requests':
        return 'Deletion Requests';
      case 'workflow-progress':
        return 'Workflow Progress';
      case 'ml-models':
        return 'ML Models & Unlearning';
      case 'verification-evidence':
        return 'Verification Evidence';
      case 'storage-backup':
        return 'Storage & Quarantine';
      case 'receipts':
        return 'Verifiable Receipts';
      case 'settings':
        return 'Enclave & Backend Settings';
      default:
        return 'Verifiable Forgetting';
    }
  };

  return (
    <header className="fixed top-0 w-full z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe border-b border-outline-variant/30">
      {/* Top Telemetry Strip */}
      <div className="px-margin py-space-xs bg-surface-container-high/60 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-space-xs flex-wrap">
          {connectionStatus === 'CONNECTED' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-label-sm text-label-sm text-emerald-700 dark:text-emerald-400 tracking-wider uppercase font-bold">
                FASTAPI BACKEND CONNECTED
              </span>
            </>
          ) : connectionStatus === 'DISCONNECTED' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-error" />
              <span className="font-label-sm text-label-sm text-error tracking-wider uppercase font-bold">
                BACKEND DISCONNECTED
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-label-sm text-label-sm text-primary tracking-wider uppercase font-bold">
                DATATHON TESTBED (DEMO FIXTURES)
              </span>
            </>
          )}

          <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
            IBM Z16 SPEC
          </span>

          {inFlightJobsCount > 0 && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]">
              {inFlightJobsCount} active in-flight
            </span>
          )}
        </div>
        <div className="flex items-center gap-space-sm font-label-sm text-label-sm">
          <span className="text-on-surface font-semibold font-mono">{currentTime}</span>
        </div>
      </div>

      {/* Main App Header */}
      <div className="h-14 px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>

          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none font-bold">
              Verifiable Forgetting
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono text-[10px]">
              IBM Z Datathon 2026 • Enterprise Architecture
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="hidden sm:inline-block font-headline-sm text-headline-sm text-primary font-semibold">
            {getPageTitle(activeView)}
          </span>

          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-xs">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>

          <button
            onClick={onOpenMenu}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Open Navigation Menu"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
