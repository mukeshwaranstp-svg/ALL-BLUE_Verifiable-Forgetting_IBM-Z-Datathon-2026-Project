import React, { useState } from 'react';
import { ZKPProofRecord } from '../types';

interface VerificationEvidenceViewProps {
  proofs: ZKPProofRecord[];
}

export const VerificationEvidenceView: React.FC<VerificationEvidenceViewProps> = ({ proofs }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Verification Evidence Explorer
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Audit trail of membership exclusion witnesses, tombstone ledger transitions, and holdout evaluations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-primary-fixed text-primary font-bold">
            Zero-Knowledge Specification
          </span>
        </div>
      </div>

      {/* Visual Proof Hash Card */}
      <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-sm bg-inverse-surface border border-slate-800 p-4 flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-[#0a192f] to-slate-900 opacity-90" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">
              fingerprint
            </span>
            <span className="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase font-mono">
              ZK Exclusion Witness Identifier (Spec Reference)
            </span>
          </div>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
            AUDIT IDENTIFIER
          </span>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="font-mono text-xs text-white truncate">
            0x9f4a7c2830fde2a19b83ce18b4aa89201bcde371
          </div>
          <button
            onClick={() => handleCopy('0x9f4a7c2830fde2a19b83ce18b4aa89201bcde371', 'top')}
            className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[13px]">
              {copiedHash === 'top' ? 'check' : 'content_copy'}
            </span>
            <span>{copiedHash === 'top' ? 'Copied' : 'Copy Hash'}</span>
          </button>
        </div>
      </div>

      {/* Principles & Evidence Limitations Notice */}
      <div className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-xl space-y-2 text-body-sm">
        <div className="flex items-center gap-2 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span>Verification Framework &amp; Technical Limitations</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-xs text-on-surface-variant">
          <li>
            <strong>Database Purge:</strong> Deleting transactional records removes live rows from database indexes, but does not alter immutable write-once backups.
          </li>
          <li>
            <strong>WORM Backups:</strong> Write-Once Read-Many physical tape archives cannot be destructively rewritten; verifiable forgetting is enforced by revoking customer encryption keys recorded in the tombstone ledger.
          </li>
          <li>
            <strong>Model Retraining:</strong> Excluding a customer from training sets requires clean retraining or calibrated DP-SGD. Weight differences alone do not prove forgetting without membership inference attack (MIA) resistance audits.
          </li>
          <li>
            <strong>Audit Hashes:</strong> Hashes serve as cryptographic integrity references, establishing an unforgeable link to recorded deletion transactions.
          </li>
        </ul>
      </div>

      {/* Proofs Table */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
          Verification Witness Records ({proofs.length})
        </h2>

        <div className="space-y-3">
          {proofs.map((proof) => (
            <div
              key={proof.id}
              className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2.5 text-body-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">{proof.id}</span>
                  <span className="text-on-surface font-semibold">
                    Request ID: {proof.requestId} ({proof.customerId})
                  </span>
                </div>
                <span className="font-mono text-[11px] text-on-surface-variant font-mono">
                  Timestamp: {proof.createdAt}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant block uppercase">
                    Witness Proof Hash ($\pi$)
                  </span>
                  <span className="text-sky-700 dark:text-sky-300 truncate block mt-0.5">
                    {proof.proofHash}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant block uppercase">
                    Signer Specification
                  </span>
                  <span className="text-on-surface truncate block mt-0.5">
                    {proof.signerSpecification}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant block uppercase">
                    Pre-Purge Merkle Root
                  </span>
                  <span className="text-secondary truncate block mt-0.5">
                    {proof.merkleRootPrePurge}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant block uppercase">
                    Post-Purge Merkle Root
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate block mt-0.5">
                    {proof.merkleRootPostPurge}
                  </span>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-on-surface-variant border-t border-outline-variant/20">
                <strong>Scope &amp; Limitations:</strong> {proof.verificationLimitations}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
