import React, { useState } from 'react';
import { DetailedDeletionEvidence, EvidenceCheckItem, VerificationCheckStatus } from '../types';

interface DetailedEvidencePanelProps {
  evidence: DetailedDeletionEvidence | null;
  isLoading?: boolean;
  onRunVerification?: () => void;
  isVerifying?: boolean;
  verificationError?: string | null;
}

export const DetailedEvidencePanel: React.FC<DetailedEvidencePanelProps> = ({
  evidence,
  isLoading = false,
  onRunVerification,
  isVerifying = false,
  verificationError = null,
}) => {
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'STORAGE' | 'ML' | 'TIMELINE'>('ALL');

  if (isLoading) {
    return (
      <div className="p-8 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-primary text-[32px] animate-spin">
          progress_activity
        </span>
        <span className="text-body-sm font-semibold text-on-surface">
          Querying audit logs and cryptographic evidence from enclave...
        </span>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/30 text-center space-y-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
          search_off
        </span>
        <p className="text-body-sm text-on-surface-variant">
          No deletion evidence loaded for the selected request.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: VerificationCheckStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
      case 'PENDING':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 animate-pulse';
      case 'FAILED':
        return 'bg-error-container text-on-error-container border-error/50 font-bold';
      case 'UNVERIFIED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300';
      case 'RETAINED':
        return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-400 font-semibold';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/40';
    }
  };

  const getStatusIcon = (status: VerificationCheckStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'verified';
      case 'PENDING':
        return 'hourglass_top';
      case 'FAILED':
        return 'cancel';
      case 'UNVERIFIED':
        return 'help_outline';
      case 'RETAINED':
        return 'lock_clock';
      default:
        return 'info';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCheckId((prev) => (prev === id ? null : id));
  };

  const allChecks: EvidenceCheckItem[] = [
    ...evidence.storage.checks,
    ...evidence.ml.checks,
  ];

  const displayedChecks = allChecks.filter((chk) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'STORAGE') return chk.category === 'STORAGE';
    if (activeTab === 'ML') return chk.category === 'ML' || chk.category === 'VERIFICATION';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Evidence Verification Action Header */}
      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              policy
            </span>
            <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
              Evidence-Driven Deletion Verification
            </h3>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded border ${getStatusBadge(
                evidence.overallStatus as any
              )}`}
            >
              {evidence.overallStatus}
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant text-xs mt-0.5">
            Request: <strong className="font-mono text-on-surface">{evidence.requestId}</strong> • Customer: <strong className="font-mono text-on-surface">{evidence.customerId}</strong> ({evidence.customerName})
          </p>
        </div>

        {onRunVerification && (
          <button
            type="button"
            onClick={onRunVerification}
            disabled={isVerifying}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all shrink-0 active:scale-[0.98]"
          >
            {isVerifying ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">
                  progress_activity
                </span>
                <span>Verifying Deletion Evidence...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">
                  task_alt
                </span>
                <span>Verify Deletion</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Verification Error / Missing Backend Endpoint Notice */}
      {verificationError && (
        <div className="p-3.5 rounded-lg bg-error-container/30 border border-error/40 text-on-surface text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-error">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>Verification Request Diagnostic</span>
          </div>
          <p className="text-on-surface-variant font-mono text-[11px] leading-relaxed">
            {verificationError}
          </p>
          <p className="text-[11px] text-on-surface-variant pt-1 border-t border-error/20">
            Note: The platform adheres to scientific honesty and does not fabricate a simulated success response when the backend verification endpoint fails or is missing.
          </p>
        </div>
      )}

      {/* Distinction of Claims Callout Banner */}
      <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface-variant flex items-start gap-2.5">
        <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">
          fact_check
        </span>
        <div className="space-y-1 text-[11px]">
          <p>
            <strong>Scientific Integrity Standard:</strong> Database deletion, WORM backup key revocation, training dataset exclusion, model retraining, and formal machine unlearning are independent claims reported separately. Deleting an active database record does not imply model unlearning, and retraining without a customer sample does not provide mathematical unlearning without certified differential privacy bounds or empirical MIA resistance verification.
          </p>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-1 border-b border-outline-variant/30 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'ALL'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          All Checks ({allChecks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('STORAGE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'STORAGE'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Storage &amp; Backup Checks ({evidence.storage.checks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ML')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'ML'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          ML Dataset &amp; Model Checks ({evidence.ml.checks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TIMELINE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'TIMELINE'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Model Transition Timeline
        </button>
      </div>

      {/* Model Transition Timeline View */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
            <h4 className="font-semibold text-xs text-on-surface uppercase tracking-wider font-mono">
              Evidence-Based Model Transition Lifecycle
            </h4>
            <span className="text-[11px] font-mono text-secondary">
              Experiment: {evidence.experimentId || 'EXP-TELUM-2026'}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {evidence.timeline.map((step) => {
              const isCompleted = step.status === 'COMPLETED';
              const isInProgress = step.status === 'IN_PROGRESS';
              const isFailed = step.status === 'FAILED';

              return (
                <div key={step.stepNumber} className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isInProgress
                        ? 'bg-sky-600 text-white animate-pulse'
                        : isFailed
                        ? 'bg-error text-white'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    ) : (
                      step.stepNumber
                    )}
                  </div>

                  <div className="flex-1 min-w-0 bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-on-surface">
                        {step.stepNumber}. {step.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          isCompleted
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isInProgress
                            ? 'text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 animate-pulse'
                            : isFailed
                            ? 'text-error bg-error-container/40'
                            : 'text-on-surface-variant bg-surface-container'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{step.description}</p>
                    {step.timestamp && (
                      <span className="text-[10px] text-secondary font-mono block mt-1">
                        Verified at: {step.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checks List */}
      {activeTab !== 'TIMELINE' && (
        <div className="space-y-2.5">
          {displayedChecks.map((check) => {
            const isExpanded = expandedCheckId === check.id;

            return (
              <div
                key={check.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-2xs transition-all"
              >
                <div
                  onClick={() => toggleExpand(check.id)}
                  className="p-3 sm:px-4 cursor-pointer hover:bg-surface-container-low/50 flex items-start sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 sm:mt-0 ${
                        check.status === 'CONFIRMED'
                          ? 'text-emerald-600'
                          : check.status === 'FAILED'
                          ? 'text-error'
                          : check.status === 'RETAINED'
                          ? 'text-slate-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {getStatusIcon(check.status)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-on-surface">
                          {check.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant">
                          {check.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        {check.resultSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                        check.status
                      )}`}
                    >
                      {check.status}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-surface-container-low/70 border-t border-outline-variant/20 text-xs space-y-3 font-mono">
                    <div>
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                        Verified Claim:
                      </span>
                      <p className="text-on-surface font-sans text-xs mt-0.5">{check.claim}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                        Technical Inspection Details:
                      </span>
                      <p className="text-on-surface font-mono text-[11px] bg-surface-container-lowest p-2 rounded border border-outline-variant/30 mt-0.5">
                        {check.details}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {check.evidenceReference && (
                        <div>
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                            Evidence Reference:
                          </span>
                          <span className="text-primary">{check.evidenceReference}</span>
                        </div>
                      )}
                      {check.artifactHash && (
                        <div>
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                            Artifact Hash:
                          </span>
                          <span className="text-sky-600 dark:text-sky-400 break-all">
                            {check.artifactHash}
                          </span>
                        </div>
                      )}
                      {check.timestamp && (
                        <div>
                          <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                            Timestamp:
                          </span>
                          <span className="text-on-surface">{check.timestamp}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                          Associated Request / Customer:
                        </span>
                        <span className="text-on-surface">
                          {evidence.requestId} • {evidence.customerId}
                        </span>
                      </div>
                    </div>

                    {check.limitations && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 text-[11px] font-sans">
                        <strong>Technical Limitation &amp; Regulatory Context:</strong>{' '}
                        {check.limitations}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
