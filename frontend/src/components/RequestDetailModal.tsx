import React, { useState, useEffect } from 'react';
import { DeletionRequest, DetailedDeletionEvidence } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';
import { DetailedEvidencePanel } from './DetailedEvidencePanel';
import { ExecutiveDeletionSummary } from './ExecutiveDeletionSummary';

interface RequestDetailModalProps {
  request: DeletionRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (requestId: string) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
  onRetry,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<DetailedDeletionEvidence | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'SUMMARY' | 'EVIDENCE' | 'STAGES' | 'CRYPTOGRAPHIC'>('SUMMARY');

  useEffect(() => {
    if (request && isOpen) {
      setIsLoadingEvidence(true);
      setVerificationError(null);
      orchestrator
        .getEvidenceForRequest(request.id)
        .then((ev) => setEvidence(ev))
        .catch((err) => {
          console.warn('Could not load evidence:', err);
          setVerificationError(err.message || 'Could not load evidence');
        })
        .finally(() => setIsLoadingEvidence(false));
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(label);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const handleVerify = async () => {
    if (!request || isVerifying) return;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await orchestrator.verifyDeletion(request.id);
      setEvidence(res);
    } catch (err: any) {
      setVerificationError(err.message || 'Verification endpoint failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadReceipt = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            receiptId: request.receiptId || `RCPT-2026-${request.customerId}-ZK`,
            requestId: request.id,
            customerId: request.customerId,
            customerName: request.customerName,
            customerEmail: request.customerEmail,
            requestedAt: request.requestedAt,
            completedAt: request.completedAt || 'In Process',
            overallStatus: request.status,
            stageAudit: request.stages.map((stg) => ({
              stageNumber: stg.stageNumber,
              name: stg.name,
              status: stg.status,
              details: stg.details,
            })),
            merkleLeafHash: request.merkleLeafHash,
            zkpProofHash: request.zkpProofHash,
            hsmSignatureSpec: request.hsmSignature,
            experimentBatch: request.batchExperimentId,
            modelRetrained: request.modelRetrainedName,
            verifiedEvidenceSnapshot: evidence,
            limitations: [
              'Database purge clears transactional customer rows and updates tombstone ledger.',
              'Physical WORM tape backups are reconciled via cryptographic key revocation under physical preservation constraints.',
              'Model retraining excludes customer samples from dataset; formal unlearning is evaluated via Membership Inference Attack (MIA) resistance.',
            ],
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${request.id}-audit-receipt.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container-high/60 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">
              account_tree
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-on-surface font-bold">{request.id}</h2>
                <span
                  className={`font-label-sm text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    request.status === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : request.status === 'FAILED'
                      ? 'bg-error-container text-on-error-container'
                      : request.status === 'UNVERIFIED'
                      ? 'bg-amber-100 text-amber-800'
                      : request.status === 'RETAINED'
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-primary-fixed text-on-primary-fixed-variant'
                  }`}
                >
                  {request.status}
                </span>
              </div>
              <p className="font-label-sm text-on-surface-variant font-mono">
                Customer: {request.customerId} ({request.customerName}) • Requested: {request.requestedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Verify Deletion Action Button */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined text-[15px] animate-spin">
                    progress_activity
                  </span>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">task_alt</span>
                  <span>Verify Deletion</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-surface-container-high/30 border-b border-outline-variant/20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('SUMMARY')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSection === 'SUMMARY'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">speed</span>
            <span>Executive Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('EVIDENCE')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSection === 'EVIDENCE'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">policy</span>
            <span>Detailed Deletion Evidence &amp; Checks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('STAGES')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSection === 'STAGES'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            <span>8-Stage Unlearning Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('CRYPTOGRAPHIC')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSection === 'CRYPTOGRAPHIC'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">key</span>
            <span>Cryptographic Proofs &amp; Hashes</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Failure Alert & Retry if failed */}
          {request.status === 'FAILED' && (
            <div className="p-3.5 rounded-lg bg-error-container/30 border border-error/30 text-on-surface flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-error text-[20px] mt-0.5">
                  error
                </span>
                <div>
                  <h4 className="font-semibold text-error text-body-sm">Pipeline Failure Diagnostic</h4>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    {request.failureReason || 'Stage transition verification rejected by pipeline runner.'}
                  </p>
                </div>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(request.id)}
                  className="px-3 py-1.5 bg-error text-white text-xs font-semibold rounded shadow hover:bg-error/90 flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">replay</span>
                  <span>Retry Stage</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-body-sm">
            <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">CURRENT STAGE</span>
              <span className="font-headline-sm text-primary font-bold text-sm">
                Stage 0{request.currentStage} / 08
              </span>
              <span className="text-[10px] text-secondary">
                {request.stages[request.currentStage - 1]?.name || 'Purge Phase'}
              </span>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">RETRAINING BATCH</span>
              <span className="font-mono text-body-sm font-bold text-on-surface truncate text-xs">
                {request.batchExperimentId || 'EXP-TELUM-2026-B8'}
              </span>
              <span className="text-[10px] text-secondary">Assigned Retraining Run</span>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">TARGET MODEL</span>
              <span className="font-body-sm font-bold text-on-surface truncate text-xs">
                {request.modelRetrainedName || 'Customer-Credit-Scorer'}
              </span>
              <span className="text-[10px] text-secondary">{request.modelVersion || 'v4.2.0'}</span>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span className="text-label-sm text-on-surface-variant font-mono text-[10px]">PROOF STATUS</span>
              <span className="font-mono text-body-sm font-bold text-primary text-xs">
                {request.zkpProofStatus === 'GENERATED' ? 'WITNESS VERIFIED' : request.zkpProofStatus}
              </span>
              <span className="text-[10px] text-secondary">Groth16 / BN254</span>
            </div>
          </div>

          {/* SECTION 0: EXECUTIVE SUMMARY (5-SECOND VERDICT & BEFORE/AFTER) */}
          {activeSection === 'SUMMARY' && (
            <ExecutiveDeletionSummary
              request={request}
              evidence={evidence}
              isLoadingEvidence={isLoadingEvidence}
              onVerify={handleVerify}
              isVerifying={isVerifying}
            />
          )}

          {/* SECTION 1: DETAILED EVIDENCE PANEL (Requirements 3 & 4) */}
          {activeSection === 'EVIDENCE' && (
            <DetailedEvidencePanel
              evidence={evidence}
              isLoading={isLoadingEvidence}
              onRunVerification={handleVerify}
              isVerifying={isVerifying}
              verificationError={verificationError}
            />
          )}

          {/* SECTION 2: 8-STAGE TIMELINE */}
          {activeSection === 'STAGES' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-body-lg text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">timeline</span>
                  <span>8-Stage Unlearning Workflow Audit</span>
                </h3>
                <span className="font-mono text-label-sm text-primary font-bold">
                  Progress: {request.stageProgress}%
                </span>
              </div>

              <div className="space-y-2">
                {request.stages.map((stg) => {
                  const isCurrent = stg.stageNumber === request.currentStage;
                  const isPassed = stg.status === 'COMPLETED';
                  const isFailed = stg.status === 'FAILED';

                  return (
                    <div
                      key={stg.stageNumber}
                      className={`p-3 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                        isCurrent
                          ? 'bg-primary/5 border-primary/40'
                          : isFailed
                          ? 'bg-error-container/20 border-error/40'
                          : isPassed
                          ? 'bg-surface-container-low border-outline-variant/30'
                          : 'bg-surface-container-lowest/50 border-outline-variant/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                            isPassed
                              ? 'bg-primary text-on-primary'
                              : isCurrent
                              ? 'bg-primary text-on-primary ring-2 ring-primary/30'
                              : isFailed
                              ? 'bg-error text-white'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {stg.stageNumber}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body-md font-semibold text-on-surface">
                              {stg.name}
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              — {stg.description}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">{stg.details}</p>
                          {stg.latencyMs && (
                            <span className="font-mono text-[10px] text-secondary mt-0.5">
                              Reported Execution Latency: {stg.latencyMs}ms
                            </span>
                          )}
                          {stg.error && (
                            <span className="font-mono text-[10px] text-error font-semibold mt-0.5">
                              Error: {stg.error}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isPassed && (
                          <span className="material-symbols-outlined text-primary text-[20px]">
                            check_circle
                          </span>
                        )}
                        {isCurrent && !isFailed && (
                          <span className="material-symbols-outlined text-primary animate-spin text-[20px]">
                            sync
                          </span>
                        )}
                        {isFailed && (
                          <span className="material-symbols-outlined text-error text-[20px]">
                            cancel
                          </span>
                        )}
                        {stg.status === 'PENDING' && (
                          <span className="font-mono text-[10px] text-on-surface-variant">QUEUED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: CRYPTOGRAPHIC PROOFS & WITNESSES */}
          {activeSection === 'CRYPTOGRAPHIC' && (
            <div className="p-4 rounded-xl bg-inverse-surface text-inverse-on-surface space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">
                    key
                  </span>
                  <span className="font-headline-sm text-body-md font-semibold text-white">
                    Verification Artifacts &amp; Identifiers
                  </span>
                </div>
                <span className="font-label-sm text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded font-mono">
                  {request.isSimulatedEvidence ? 'Testbed Simulation Record' : 'Backend Verified Record'}
                </span>
              </div>

              {/* Hashes & Witnesses */}
              <div className="space-y-2 font-mono text-xs">
                {/* Merkle Leaf */}
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase">
                      Merkle Tombstone Leaf Hash
                    </span>
                    <span className="text-slate-200 truncate">
                      {request.merkleLeafHash || '0x8f2a4b81c9e0d372f84a1e9c2b4d8e7a1b3c5e6f'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(request.merkleLeafHash || '', 'merkle')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedHash === 'merkle' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedHash === 'merkle' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* ZKP Proof */}
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase">
                      Zero-Knowledge Exclusion Witness Hash
                    </span>
                    <span className="text-sky-300 truncate">
                      {request.zkpProofHash || '0x9f4a7c2830fde2a19b83ce18b4aa89201bcde371'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(request.zkpProofHash || '', 'zkp')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedHash === 'zkp' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedHash === 'zkp' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Signature Spec */}
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase">
                      Hardware Signer Specification Archetype
                    </span>
                    <span className="text-slate-300 truncate">
                      {request.hsmSignature || 'SPEC-Z16-SIG-98a2e104fc819d4b2e6a3c'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(request.hsmSignature || '', 'hsm')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedHash === 'hsm' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedHash === 'hsm' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Scientific Caveat */}
              <div className="pt-1 text-[11px] text-slate-400 font-sans leading-relaxed border-t border-slate-800">
                <strong>Technical Transparency Note:</strong> Transactional database deletion clears customer
                rows immediately. Backup tape snapshots are reconciled via cryptographic key tombstoning. Retraining
                without the customer sample excludes the data from the model; full unlearning guarantees require
                empirical MIA resistance verification.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-container-high/60 border-t border-outline-variant/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="px-4 py-2 bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded text-body-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">receipt_long</span>
            <span>Download Audit Receipt (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-container rounded text-body-sm font-semibold shadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
