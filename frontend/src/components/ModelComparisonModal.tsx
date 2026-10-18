import React, { useState, useEffect } from 'react';
import { MLModelMetadata, RetrainingExperiment, DeletionRequest, DetailedDeletionEvidence } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';
import { DetailedEvidencePanel } from './DetailedEvidencePanel';

interface ModelComparisonModalProps {
  model: MLModelMetadata;
  experiment?: RetrainingExperiment;
  selectedRequest?: DeletionRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyDeletion?: (requestId: string) => void;
}

export const ModelComparisonModal: React.FC<ModelComparisonModalProps> = ({
  model,
  experiment,
  selectedRequest,
  isOpen,
  onClose,
  onVerifyDeletion,
}) => {
  const [evidence, setEvidence] = useState<DetailedDeletionEvidence | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);

  // Identify target request ID
  const activeRequestId =
    selectedRequest?.id ||
    experiment?.associatedRequestIds?.[0] ||
    (model.targetCustomerId ? `DEL-2026-${model.targetCustomerId.replace('CUST-', '')}` : undefined);

  useEffect(() => {
    if (activeRequestId && isOpen) {
      orchestrator
        .getEvidenceForRequest(activeRequestId)
        .then((ev) => setEvidence(ev))
        .catch((err) => {
          console.warn('Could not load evidence for modal:', err);
        });
    }
  }, [activeRequestId, isOpen]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!activeRequestId || isVerifying) return;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await orchestrator.verifyDeletion(activeRequestId);
      setEvidence(res);
      if (onVerifyDeletion) {
        onVerifyDeletion(activeRequestId);
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Verification endpoint failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const hasEvaluationMetrics =
    model.testAccuracyBaseline !== undefined &&
    model.testAccuracyRetrained !== undefined;

  const testAccuracyDelta = hasEvaluationMetrics
    ? (model.testAccuracyRetrained! - model.testAccuracyBaseline!).toFixed(1)
    : null;

  const lossDeltaPercent =
    model.baselineLoss > 0
      ? (((model.currentLoss - model.baselineLoss) / model.baselineLoss) * 100).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-container-high/60 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">
              analytics
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-headline-sm text-on-surface font-bold">
                  Model Comparison &amp; Unlearning Verification
                </h2>
                <span className="font-mono text-label-sm bg-primary-fixed text-primary px-2 py-0.5 rounded font-bold">
                  {model.version}
                </span>
              </div>
              <p className="font-label-sm text-on-surface-variant font-mono text-xs">
                {model.name} • {model.assignedAccelerator}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Verify Deletion Action Button */}
            {activeRequestId && (
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
                    <span>Verify Deletion ({activeRequestId})</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {verificationError && (
            <div className="p-3.5 rounded-lg bg-error-container/30 border border-error/40 text-on-surface text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold text-error">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>Verification Error Diagnostic</span>
              </div>
              <p className="text-on-surface-variant font-mono text-[11px] leading-relaxed">
                {verificationError}
              </p>
            </div>
          )}

          {/* Model Architecture & Specification Card */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono uppercase">
                Model Classification &amp; Specification
              </span>
              <span className="font-mono text-label-sm text-primary font-semibold">
                Evaluation Set: {model.evaluationDatasetId || 'Mainline Evaluation Split'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
              <div>
                <span className="text-on-surface-variant text-label-sm block">Model Type:</span>
                <span className="font-semibold text-on-surface">{model.modelType}</span>
              </div>
              <div>
                <span className="text-on-surface-variant text-label-sm block">Architecture Topology:</span>
                <span className="font-mono text-on-surface font-semibold">
                  [{model.layerSizes.join(' → ')}]
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-on-surface-variant text-label-sm block">Architecture Details:</span>
                <span className="font-mono text-xs text-on-surface bg-surface-container-lowest px-2 py-1 rounded block mt-0.5">
                  {model.architectureDescription}
                </span>
              </div>
            </div>
          </div>

          {/* Model Comparison Matrix: Baseline vs Retrained */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-body-lg text-on-surface font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">compare_arrows</span>
                <span>Baseline vs. Retrained Model Comparison</span>
              </h3>
              <span className="text-label-sm font-mono text-secondary">
                Experiment: {model.associatedExperimentId}
              </span>
            </div>

            <div className="overflow-x-auto border border-outline-variant/30 rounded-xl">
              <table className="w-full text-left text-body-sm">
                <thead className="bg-surface-container-high/70 text-on-surface-variant font-label-sm text-label-sm">
                  <tr>
                    <th className="py-2.5 px-3">Metric / Property</th>
                    <th className="py-2.5 px-3">Baseline ({model.baselineVersion})</th>
                    <th className="py-2.5 px-3">Retrained ({model.version})</th>
                    <th className="py-2.5 px-3">Delta / Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-mono text-xs">
                  {/* MIA Resistance */}
                  {model.miaResistance !== undefined && (
                    <tr className="hover:bg-surface-container-low">
                      <td className="py-2.5 px-3 font-sans font-medium text-on-surface">
                        MIA Resistance (Membership Attack)
                      </td>
                      <td className="py-2.5 px-3 text-secondary">{model.miaBaseline ?? 50.0}%</td>
                      <td className="py-2.5 px-3 text-sky-700 dark:text-sky-300 font-bold">
                        {model.miaResistance}%
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">
                        +{((model.miaResistance) - (model.miaBaseline ?? 50)).toFixed(1)}% resistance
                      </td>
                    </tr>
                  )}

                  {/* Test Accuracy */}
                  {hasEvaluationMetrics && (
                    <tr className="hover:bg-surface-container-low">
                      <td className="py-2.5 px-3 font-sans font-medium text-on-surface">
                        Test Accuracy (Holdout Set)
                      </td>
                      <td className="py-2.5 px-3 text-on-surface">{model.testAccuracyBaseline}%</td>
                      <td className="py-2.5 px-3 text-on-surface">{model.testAccuracyRetrained}%</td>
                      <td className="py-2.5 px-3 text-on-surface-variant">
                        {testAccuracyDelta}% (Utility drift)
                      </td>
                    </tr>
                  )}

                  {/* Loss */}
                  <tr className="hover:bg-surface-container-low">
                    <td className="py-2.5 px-3 font-sans font-medium text-on-surface">
                      Cross-Entropy Loss
                    </td>
                    <td className="py-2.5 px-3 text-on-surface">{model.baselineLoss}</td>
                    <td className="py-2.5 px-3 text-on-surface font-semibold">{model.currentLoss}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-semibold">
                      {lossDeltaPercent ? `${lossDeltaPercent}%` : 'Evaluated'}
                    </td>
                  </tr>

                  {/* Weight Delta Norm */}
                  {model.weightDeltaNorm !== undefined && (
                    <tr className="hover:bg-surface-container-low">
                      <td className="py-2.5 px-3 font-sans font-medium text-on-surface">
                        Weight Vector Shift (||ΔW||₂)
                      </td>
                      <td className="py-2.5 px-3 text-secondary">0.000</td>
                      <td className="py-2.5 px-3 text-amber-600 font-bold">{model.weightDeltaNorm}</td>
                      <td className="py-2.5 px-3 text-on-surface-variant">Empirical L2 Shift</td>
                    </tr>
                  )}

                  {/* DP Hyperparameters */}
                  {model.dpSgdEpsilon !== undefined && (
                    <tr className="hover:bg-surface-container-low">
                      <td className="py-2.5 px-3 font-sans font-medium text-on-surface">
                        Differential Privacy Parameter
                      </td>
                      <td className="py-2.5 px-3 text-secondary">Standard SGD</td>
                      <td className="py-2.5 px-3 text-primary font-bold">
                        ε = {model.dpSgdEpsilon}, δ = {model.dpSgdDelta || '1e-5'}
                      </td>
                      <td className="py-2.5 px-3 text-primary font-semibold">DP-SGD Bound</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Excluded Customers & Shared Experiment Batch Section */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">group_remove</span>
                <span>Batch Excluded Customers from Training Set</span>
              </span>
              <span className="font-mono text-label-sm text-on-surface-variant">
                Dataset: {model.datasetId}
              </span>
            </div>

            <p className="text-body-sm text-on-surface-variant text-[12px]">
              The following customer samples were confirmed excluded from the dataset partition prior
              to model retraining:
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {model.excludedCustomerIds.length > 0 ? (
                model.excludedCustomerIds.map((cid) => (
                  <span
                    key={cid}
                    className="font-mono text-xs px-2.5 py-1 rounded bg-surface-container-lowest border border-outline-variant/40 text-primary font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">check</span>
                    <span>{cid}</span>
                  </span>
                ))
              ) : (
                <span className="text-body-sm text-on-surface-variant italic">
                  No customer records excluded in baseline run.
                </span>
              )}
            </div>
          </div>

          {/* Detailed Deletion Evidence Collapsible Section (Requirements 4, 5 & 6) */}
          <div className="border border-outline-variant/30 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEvidencePanel((p) => !p)}
              className="w-full p-4 bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  verified_user
                </span>
                <span className="font-headline-sm text-xs font-bold text-on-surface">
                  Inspect Supporting Cryptographic &amp; Storage Evidence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary font-semibold">
                  {showEvidencePanel ? 'Hide Evidence Checks' : 'Show Detailed Evidence Checks'}
                </span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                  {showEvidencePanel ? 'expand_less' : 'expand_more'}
                </span>
              </div>
            </button>

            {showEvidencePanel && (
              <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/30">
                <DetailedEvidencePanel
                  evidence={evidence}
                  onRunVerification={handleVerify}
                  isVerifying={isVerifying}
                  verificationError={verificationError}
                />
              </div>
            )}
          </div>

          {/* Scientific Disclaimer Note */}
          <div className="p-3 bg-surface-container rounded-lg text-body-sm text-on-surface-variant flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">
              shield
            </span>
            <div className="text-[11px] space-y-1">
              <p>
                <strong>Scientific Unlearning Principles:</strong>
                Removing a customer from training data and retraining excludes the sample from future updates.
                Membership Inference Attack (MIA) resistance evaluates whether an adversary can infer prior inclusion.
                Weight differences alone do not prove unlearning without statistical or differential privacy bounds.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-container-high/60 border-t border-outline-variant/30 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary text-on-primary hover:bg-primary-container rounded text-body-sm font-semibold shadow"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
