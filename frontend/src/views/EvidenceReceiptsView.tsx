import React, { useState } from 'react';
import { ZKPProofRecord, ImmutableReceipt } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';

interface EvidenceReceiptsViewProps {
  proofs: ZKPProofRecord[];
  receipts: ImmutableReceipt[];
}

export const EvidenceReceiptsView: React.FC<EvidenceReceiptsViewProps> = ({
  proofs,
  receipts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'evidence' | 'receipts'>('evidence');
  const [selectedReceipt, setSelectedReceipt] = useState<ImmutableReceipt | null>(receipts[0] || null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const handleDownloadJson = (receipt: ImmutableReceipt) => {
    const blob = new Blob([receipt.downloadableJson || JSON.stringify(receipt, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.receiptId}-audit-certificate.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Top Header Banner */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              verified
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Evidence &amp; Immutable Receipts
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Inspect zero-knowledge cryptographic verification evidence, Merkle witness proofs, and downloadable hardware-signed audit receipts.
          </p>
        </div>

        {/* Sub-tabs switcher */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('evidence')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'evidence'
                ? 'bg-primary text-white shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Verification Evidence ({proofs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('receipts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'receipts'
                ? 'bg-primary text-white shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Immutable Receipts ({receipts.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'evidence' ? (
        /* VERIFICATION EVIDENCE & ZK PROOFS */
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  security
                </span>
                <h2 className="font-headline-sm text-on-surface font-bold text-base">
                  Zero-Knowledge Proofs &amp; Cryptographic Witnesses
                </h2>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">
                Circuit Type: Groth16 / BN254 (IBM Telum Spec)
              </span>
            </div>

            {proofs.length === 0 ? (
              <p className="text-center py-8 text-on-surface-variant text-xs">
                No verification proofs generated yet. Complete a deletion request workflow to generate ZK witness proofs.
              </p>
            ) : (
              <div className="space-y-4">
                {proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-primary text-sm">
                          {proof.id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-[11px]">
                          Request: {proof.requestId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-[11px]">
                          Customer: {proof.customerId}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>{proof.verified ? 'VERIFIED WITNESS' : 'PENDING'}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Proof Hash (ZK-SNARK)</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-on-surface truncate max-w-[200px]" title={proof.proofHash}>
                            {proof.proofHash}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(proof.proofHash, proof.id + '-proof')}
                            className="p-1 rounded hover:bg-surface-container text-on-surface-variant shrink-0"
                            title="Copy Hash"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedHash === proof.id + '-proof' ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Public Inputs Hash</span>
                        <span className="text-on-surface truncate block mt-0.5" title={proof.publicInputsHash}>
                          {proof.publicInputsHash}
                        </span>
                      </div>

                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Verification Key Fingerprint</span>
                        <span className="text-primary font-semibold block mt-0.5">
                          {proof.verificationKeyFingerprint}
                        </span>
                      </div>

                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Merkle Root (Pre-Purge)</span>
                        <span className="text-on-surface truncate block mt-0.5" title={proof.merkleRootPrePurge}>
                          {proof.merkleRootPrePurge}
                        </span>
                      </div>

                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Merkle Root (Post-Purge)</span>
                        <span className="text-emerald-600 dark:text-emerald-400 truncate block mt-0.5" title={proof.merkleRootPostPurge}>
                          {proof.merkleRootPostPurge}
                        </span>
                      </div>

                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Hardware Signer Spec</span>
                        <span className="text-on-surface block mt-0.5">{proof.signerSpecification}</span>
                      </div>
                    </div>

                    {proof.verificationLimitations && (
                      <div className="p-2.5 rounded-lg bg-surface-container text-[11px] text-on-surface-variant font-mono">
                        <strong className="text-on-surface block mb-0.5">Verification Scope &amp; Limitations:</strong>
                        {proof.verificationLimitations}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* IMMUTABLE RECEIPTS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          {/* Receipts Sidebar List */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 space-y-3 lg:col-span-1">
            <h3 className="font-headline-sm text-on-surface font-bold text-sm">
              Issued Audit Certificates ({receipts.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {receipts.map((rc) => {
                const isSelected = selectedReceipt?.receiptId === rc.receiptId;
                return (
                  <div
                    key={rc.receiptId}
                    onClick={() => setSelectedReceipt(rc)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-xs'
                        : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-primary">{rc.receiptId}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {rc.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-on-surface font-semibold">
                      {rc.customerName} ({rc.customerId})
                    </div>
                    <div className="text-[10px] font-mono text-on-surface-variant mt-0.5">
                      Issued: {rc.issuedAt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Receipt Detail Panel */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 space-y-4 lg:col-span-2">
            {selectedReceipt ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
                  <div>
                    <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold">
                      Immutable Audit Certificate
                    </span>
                    <h3 className="font-headline-sm text-on-surface font-bold text-lg">
                      {selectedReceipt.receiptId}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadJson(selectedReceipt)}
                      className="px-4 py-2 bg-primary text-white hover:bg-primary-container rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Download JSON Certificate</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
                    <span className="text-on-surface-variant text-[10px] uppercase block">Request Reference</span>
                    <strong className="text-on-surface">{selectedReceipt.requestId}</strong>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
                    <span className="text-on-surface-variant text-[10px] uppercase block">Customer Target</span>
                    <strong className="text-on-surface">{selectedReceipt.customerName} ({selectedReceipt.customerId})</strong>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
                    <span className="text-on-surface-variant text-[10px] uppercase block">Hardware Enclave Target</span>
                    <span className="text-on-surface text-[11px]">{selectedReceipt.enclaveTarget}</span>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
                    <span className="text-on-surface-variant text-[10px] uppercase block">HSM Signing Key ID</span>
                    <span className="text-primary text-[11px]">{selectedReceipt.keyId}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold">
                    Cryptographic Signatures &amp; Hashes
                  </span>
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 font-mono text-[11px] space-y-1.5">
                    <div>
                      <span className="text-slate-400 block">Signature R:</span>
                      <span className="text-on-surface truncate block">{selectedReceipt.signatureR}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Signature S:</span>
                      <span className="text-on-surface truncate block">{selectedReceipt.signatureS}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ZKP Proof Hash:</span>
                      <span className="text-primary truncate block">{selectedReceipt.zkpProofHash}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs text-on-surface-variant space-y-1">
                  <strong className="text-on-surface font-semibold block">Audit Limitations &amp; Provenance:</strong>
                  <p className="leading-relaxed font-mono text-[11px]">{selectedReceipt.limitations}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-on-surface-variant">
                Select an immutable receipt from the left list to inspect cryptographic signatures and proofs.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
