import React from 'react';

interface DesktopSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  counts: {
    total: number;
    awaitingProcessing: number;
    inProgress: number;
    confirmed: number;
    failed: number;
    requiringVerification: number;
  };
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeView,
  onNavigate,
  counts,
}) => {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'live-deletion', label: 'Live Deletion Studio', icon: 'bolt' },
    { id: 'customers', label: 'Customers', icon: 'person_search' },
    { id: 'deletion-requests', label: 'Deletion Requests', icon: 'playlist_remove', count: counts.inProgress + counts.awaitingProcessing },
    { id: 'model-changes', label: 'Model Changes', icon: 'model_training' },
    { id: 'evidence-receipts', label: 'Evidence & Receipts', icon: 'verified' },
  ];

  const advancedLinks = [
    { id: 'storage-backup', label: 'Storage & Backup Logs', icon: 'storage' },
    { id: 'settings', label: 'Advanced Settings', icon: 'tune' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface-container-lowest border-r border-outline-variant/30 shrink-0 sticky top-20 h-[calc(100vh-5rem)] p-4 justify-between">
      <div className="flex flex-col gap-1">
        <div className="px-3 py-2 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant font-mono">
          Security Enclave
        </div>

        {links.map((link) => {
          const isActive = activeView === link.id;
          return (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-body-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-[19px] ${
                    isActive ? 'text-primary' : 'text-secondary'
                  }`}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </div>
              {link.count !== undefined && link.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {link.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-3 mt-3 border-t border-outline-variant/20">
          <div className="px-3 py-1 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant font-mono text-[10px]">
            Advanced Details
          </div>
          {advancedLinks.map((link) => {
            const isActive = activeView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors mt-1 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[17px] ${isActive ? 'text-primary' : 'text-secondary'}`}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster Node Status Badge */}
      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-on-surface-variant font-mono text-[10px]">
            TELUM ACCELERATOR
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <span className="font-mono text-primary font-bold text-body-sm">
          IBM z16 Enclave #08
        </span>
        <div className="flex justify-between text-[11px] text-on-surface-variant font-mono pt-1 border-t border-outline-variant/20">
          <span>Active In-Flight:</span>
          <strong className="text-on-surface">{counts.inProgress + counts.awaitingProcessing}</strong>
        </div>
        <div className="flex justify-between text-[11px] text-on-surface-variant font-mono">
          <span>Verified Completed:</span>
          <strong className="text-emerald-600">{counts.confirmed}</strong>
        </div>
      </div>
    </aside>
  );
};
