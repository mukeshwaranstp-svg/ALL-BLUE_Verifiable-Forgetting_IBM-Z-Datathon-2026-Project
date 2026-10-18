import React from 'react';

export const StorageBackupView: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-md">
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">storage</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Storage &amp; Backup Key Reconciliation
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Cryptographic erasure for Write-Once Read-Many (WORM) tape snapshots and air-gapped sandboxes.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded bg-primary-fixed text-primary font-bold">
          Air-Gap Policy Active
        </span>
      </div>

      {/* Critical Technical Disclosure */}
      <div className="p-4 bg-surface-container-low border border-primary/20 rounded-xl space-y-1.5 text-body-sm">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <span className="material-symbols-outlined text-[20px]">verified_user</span>
          <span>How Backup Deletion Operates Under WORM Tape Constraints</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Physical WORM (Write-Once Read-Many) tape media is immutable by design and cannot be rewritten or erased
          without physical volume destruction. Verifiable forgetting handles backup compliance through
          <strong> Cryptographic Erasure (Crypto-Shredding)</strong>: every customer record on tape is encrypted
          with a dedicated per-subject key. When a deletion request commits, the orchestrator revokes that key in
          the hardware tombstone ledger, rendering past backup snapshots mathematically undecryptable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Ephemeral Sandbox */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">security</span>
              <h2 className="font-headline-sm text-on-surface font-bold">Ephemeral Sandbox</h2>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              ISOLATED
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant text-xs">
            Dynamic virtual enclave initialized during regression test suites with network egress blocked.
          </p>
          <div className="space-y-1.5 pt-2 border-t border-outline-variant/20 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Merkle Tree Depth:</span>
              <span className="font-bold text-on-surface">24 levels</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Verified Tombstone Nodes:</span>
              <span className="font-bold text-on-surface">428,910 nodes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Sandbox Memory:</span>
              <span className="font-bold text-on-surface">Isolated Enclave RAM</span>
            </div>
          </div>
        </div>

        {/* WORM Tape Archive */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">tape</span>
              <h2 className="font-headline-sm text-on-surface font-bold">WORM Tape Archive Key Log</h2>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-primary-fixed text-primary font-bold">
              3 SNAPSHOTS
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant text-xs">
            Write-Once Tape volumes audited against the tombstone registry. Deletions apply via key revocation.
          </p>
          <div className="space-y-1.5 pt-2 border-t border-outline-variant/20 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Snapshot #2026-03-28:</span>
              <span className="text-emerald-700 font-semibold">Tombstone Keys Revoked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Snapshot #2026-06-30:</span>
              <span className="text-emerald-700 font-semibold">Tombstone Keys Revoked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Snapshot #2026-09-30:</span>
              <span className="text-sky-700 font-semibold">Active Key Reconciliation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
