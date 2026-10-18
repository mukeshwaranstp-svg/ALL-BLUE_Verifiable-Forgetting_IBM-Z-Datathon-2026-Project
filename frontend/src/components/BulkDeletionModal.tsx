import React, { useState } from 'react';
import { Customer } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';
import { BulkSubmissionResult } from '../services/apiClient';

interface BulkDeletionModalProps {
  selectedCustomers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: BulkSubmissionResult) => void;
}

export const BulkDeletionModal: React.FC<BulkDeletionModalProps> = ({
  selectedCustomers,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<BulkSubmissionResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Pre-validate selection
  const validCustomers = selectedCustomers.filter(
    (c) => c.eligibleForUnlearning && !c.currentDeletionId
  );
  const ineligibleCustomers = selectedCustomers.filter(
    (c) => !c.eligibleForUnlearning || Boolean(c.currentDeletionId)
  );

  const handleSubmit = async () => {
    // 5. Prevent repeated submissions caused by double-clicking
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await orchestrator.submitBulkDeletion(selectedCustomers.map((c) => c.id));
      setSubmissionResult(result);
      onSuccess(result);
    } catch (err: any) {
      console.error('Bulk submission failure:', err);
      setSubmissionError(err.message || 'Failed to submit bulk deletion request through backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container-high/60 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              playlist_remove
            </span>
            <div>
              <h2 className="font-headline-sm text-on-surface font-bold">
                {submissionResult ? 'Bulk Deletion Submission Results' : 'Confirm Bulk Deletion Requests'}
              </h2>
              <p className="font-label-sm text-on-surface-variant font-mono">
                {orchestrator.getConnectionStatus() === 'CONNECTED'
                  ? 'Connected to FastAPI Deletion Orchestrator'
                  : 'Datathon Prototype Sandbox (Development Mode)'}
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submissionError && (
            <div className="p-3.5 rounded-lg bg-error-container/30 border border-error/40 text-on-error-container flex items-start gap-2.5">
              <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
              <div>
                <p className="font-semibold text-xs text-error">Backend Submission Error</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{submissionError}</p>
              </div>
            </div>
          )}

          {!submissionResult ? (
            <>
              {/* Summary Banner */}
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-primary/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                  info
                </span>
                <div className="text-body-sm text-on-surface space-y-1">
                  <p className="font-semibold text-on-surface">
                    Preparing {selectedCustomers.length} Customer Deletion Request{selectedCustomers.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    Each accepted request will be assigned a unique tracking ID and scheduled across the
                    8-stage verifiable forgetting pipeline (Database Purge, Tombstone Indexing, Backup
                    Key Reconciliation, Model Retraining, and Verification).
                  </p>
                </div>
              </div>

              {/* Warning for ineligible customers */}
              {ineligibleCustomers.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>{ineligibleCustomers.length} Ineligible or Already In-Flight Customer(s):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {ineligibleCustomers.map((c) => (
                      <li key={c.id}>
                        <strong>{c.id} ({c.name})</strong>: {c.legalHoldReason || 'Deletion request already active in progress'}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-amber-800 dark:text-amber-300">
                    The orchestrator will reject these entries and only accept validated eligible records.
                  </p>
                </div>
              )}

              {/* Selected Customer List Table */}
              <div className="border border-outline-variant/40 rounded-lg overflow-hidden">
                <div className="bg-surface-container px-3 py-2 text-label-sm font-label-sm text-on-surface-variant flex justify-between">
                  <span>Selected Customers ({selectedCustomers.length})</span>
                  <span>Batch Retraining Eligibility Check</span>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-outline-variant/20">
                  {selectedCustomers.map((cust) => {
                    const isInvalid = !cust.eligibleForUnlearning || Boolean(cust.currentDeletionId);
                    return (
                      <div
                        key={cust.id}
                        className={`px-3 py-2 flex items-center justify-between text-body-sm ${
                          isInvalid ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-label-sm font-semibold text-primary">
                              {cust.id}
                            </span>
                            <span className="font-semibold text-on-surface">{cust.name}</span>
                          </div>
                          <span className="text-on-surface-variant text-body-sm text-[11px]">
                            {cust.email} • {cust.jurisdiction} • {cust.recordsCount.toLocaleString()} records
                          </span>
                        </div>
                        <div className="text-right">
                          {isInvalid ? (
                            <span className="font-label-sm text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                              WILL BE REJECTED
                            </span>
                          ) : (
                            <span className="font-label-sm text-[10px] text-primary font-semibold bg-primary-fixed px-1.5 py-0.5 rounded">
                              ELIGIBLE READY
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Retraining Configuration Details */}
              <div className="bg-surface-container-low p-3 rounded-lg text-body-sm space-y-1">
                <div className="flex justify-between text-label-sm text-on-surface-variant">
                  <span>Target Unlearning Model:</span>
                  <span className="font-semibold text-on-surface">Customer-Credit-Scorer-v4</span>
                </div>
                <div className="flex justify-between text-label-sm text-on-surface-variant">
                  <span>Unlearning Strategy:</span>
                  <span className="font-semibold text-on-surface">Sample Exclusion with Model Retraining</span>
                </div>
                <div className="flex justify-between text-label-sm text-on-surface-variant">
                  <span>Verification Requirement:</span>
                  <span className="font-semibold text-on-surface">MIA audit &amp; tombstone ledger audit</span>
                </div>
              </div>
            </>
          ) : (
            /* Submission Results View */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-semibold text-headline-sm text-emerald-700 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                  <span>{submissionResult.accepted.length} Deletion Requests Accepted</span>
                </div>
                {submissionResult.batchExperimentId && (
                  <p className="mt-1 text-label-sm font-mono text-emerald-800 dark:text-emerald-300">
                    Grouped in Retraining Experiment Batch: <strong>{submissionResult.batchExperimentId}</strong>
                  </p>
                )}
              </div>

              {/* Accepted Requests List */}
              {submissionResult.accepted.length > 0 && (
                <div className="border border-outline-variant/40 rounded-lg overflow-hidden">
                  <div className="bg-surface-container px-3 py-1.5 text-label-sm font-label-sm text-on-surface-variant font-semibold">
                    Accepted Requests Scheduled in Orchestrator
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-outline-variant/20">
                    {submissionResult.accepted.map((req) => (
                      <div
                        key={req.id}
                        className="px-3 py-2 flex items-center justify-between text-body-sm bg-surface-container-low"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-label-sm font-bold text-primary">
                              {req.id}
                            </span>
                            <span className="text-on-surface font-semibold">{req.customerName}</span>
                          </div>
                          <span className="font-label-sm text-[10px] text-on-surface-variant font-mono">
                            Customer ID: {req.customerId} • Stage 01 Initialized
                          </span>
                        </div>
                        <span className="font-label-sm text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded font-bold font-mono">
                          STAGE 01
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected Requests List */}
              {submissionResult.rejected.length > 0 && (
                <div className="border border-error/30 rounded-lg overflow-hidden bg-error-container/20">
                  <div className="bg-error-container/40 px-3 py-1.5 text-label-sm font-label-sm text-error font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                    <span>Rejected Requests ({submissionResult.rejected.length})</span>
                  </div>
                  <div className="divide-y divide-error/20">
                    {submissionResult.rejected.map((rej) => (
                      <div key={rej.customerId} className="px-3 py-2 text-body-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-label-sm font-bold text-error">
                            {rej.customerId} {rej.customerName ? `(${rej.customerName})` : ''}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-error">REJECTED</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{rej.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-surface-container-high/60 border-t border-outline-variant/30 flex items-center justify-end gap-2.5">
          {!submissionResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded text-body-sm font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedCustomers.length === 0}
                className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-container rounded text-body-sm font-semibold flex items-center gap-2 shadow active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Submitting via Backend...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      send
                    </span>
                    <span>Submit Bulk Deletions ({selectedCustomers.length})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-container rounded text-body-sm font-semibold shadow"
            >
              Close &amp; Monitor in Workflow
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
