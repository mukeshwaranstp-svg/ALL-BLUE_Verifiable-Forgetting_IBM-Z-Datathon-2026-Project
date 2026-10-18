import React, { useState } from 'react';
import { ImmutableReceipt } from '../types';

interface ReceiptsViewProps {
  receipts: ImmutableReceipt[];
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({ receipts }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (rcpt: ImmutableReceipt) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(rcpt.downloadableJson);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${rcpt.receiptId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">receipt_long</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Verifiable Deletion &amp; Unlearning Receipts
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Structured audit certificates documenting transactional database purge, tombstone indexing,
            and retraining dataset exclusion.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">
          {receipts.length} Audit Certificates
        </span>
      </div>

      <div className="space-y-3">
        {receipts.map((rcpt) => (
          <div
            key={rcpt.receiptId}
            className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">{rcpt.receiptId}</span>
                <span className="font-semibold text-on-surface text-body-sm">
                  {rcpt.customerName} ({rcpt.customerId})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-on-surface-variant">{rcpt.issuedAt}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  {rcpt.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-surface-container-low p-2 rounded">
                <span className="text-[10px] text-on-surface-variant block uppercase">
                  Target Enclave Key Specification
                </span>
                <span className="text-on-surface truncate block mt-0.5">{rcpt.keyId}</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded">
                <span className="text-[10px] text-on-surface-variant block uppercase">
                  ZK Verification Witness
                </span>
                <span className="text-sky-700 dark:text-sky-300 truncate block mt-0.5">
                  {rcpt.zkpProofHash}
                </span>
              </div>
              <div className="bg-surface-container-low p-2 rounded">
                <span className="text-[10px] text-on-surface-variant block uppercase">
                  Signature Specification Archetype
                </span>
                <span className="text-secondary truncate block mt-0.5">
                  {rcpt.signatureR.slice(0, 24)}...
                </span>
              </div>
              <div className="bg-surface-container-low p-2 rounded">
                <span className="text-[10px] text-on-surface-variant block uppercase">
                  Enclave Target Architecture
                </span>
                <span className="text-on-surface truncate block mt-0.5">{rcpt.enclaveTarget}</span>
              </div>
            </div>

            {rcpt.limitations && (
              <div className="text-[11px] text-on-surface-variant bg-surface-container-low p-2 rounded border border-outline-variant/20">
                <strong>Audit Scope &amp; Constraints:</strong> {rcpt.limitations}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => handleCopy(rcpt.downloadableJson, rcpt.receiptId)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedId === rcpt.receiptId ? 'check' : 'content_copy'}
                </span>
                <span>{copiedId === rcpt.receiptId ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={() => handleDownload(rcpt)}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>Download Audit Certificate</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
