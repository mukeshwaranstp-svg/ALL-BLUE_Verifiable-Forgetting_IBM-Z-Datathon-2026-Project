import React from 'react';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'deletion-requests', label: 'Deletion Requests', icon: 'playlist_remove' },
    { id: 'workflow-progress', label: 'Workflow Progress', icon: 'schema' },
    { id: 'ml-models', label: 'ML Models & Neural Net', icon: 'model_training' },
    { id: 'verification-evidence', label: 'Verification Evidence', icon: 'gavel' },
    { id: 'storage-backup', label: 'Storage & Backup', icon: 'storage' },
    { id: 'receipts', label: 'Receipts & Proofs', icon: 'receipt_long' },
    { id: 'settings', label: 'Enclave Settings', icon: 'tune' },
  ];

  return (
    <aside className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-surface-container-lowest shadow-2xl p-space-lg flex flex-col pt-safe pb-safe z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/30">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              System Navigation
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Links list */}
        <div className="flex flex-col gap-space-xs py-space-sm overflow-y-auto flex-1">
          {links.map((link) => {
            const isActive = activeView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  onNavigate(link.id);
                  onClose();
                }}
                className={`flex items-center gap-space-md px-space-md h-11 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                <span className="font-body-md text-body-md">{link.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info box */}
        <div className="pt-space-md bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs border border-outline-variant/20">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
            HOST CLUSTER
          </span>
          <span className="font-label-md text-label-md text-primary font-bold font-mono">
            z16-PROD-ENC-04A
          </span>
          <span className="font-body-sm text-body-sm text-secondary">
            EAL5+ Hardware Cryptography Active
          </span>
        </div>
      </div>
    </aside>
  );
};
