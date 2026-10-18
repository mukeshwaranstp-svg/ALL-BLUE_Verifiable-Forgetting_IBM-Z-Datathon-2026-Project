import React, { useState } from 'react';
import { MLModelMetadata, RetrainingExperiment, DeletionRequest, DetailedDeletionEvidence } from '../types';
import { NeuralNetworkVisualizer } from '../components/NeuralNetworkVisualizer';
import { ModelComparisonModal } from '../components/ModelComparisonModal';
import { DetailedEvidencePanel } from '../components/DetailedEvidencePanel';
import { orchestrator } from '../services/unlearningOrchestrator';

interface MLModelsViewProps {
  models: MLModelMetadata[];
  experiments: RetrainingExperiment[];
  requests?: DeletionRequest[];
  onInspectRequest?: (req: DeletionRequest) => void;
}

export const MLModelsView: React.FC<MLModelsViewProps> = ({
  models,
  experiments,
  requests = [],
  onInspectRequest,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || 'mdl-credit-scorer-v4');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requests[0]?.id || '');
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [requestEvidence, setRequestEvidence] = useState<DetailedDeletionEvidence | null>(null);
  const [showEvidenceSection, setShowEvidenceSection] = useState<boolean>(false);

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0];
  const associatedExperiment = experiments.find(
    (exp) => exp.id === currentModel?.associatedExperimentId
  );

  const currentRequest = requests.find((r) => r.id === selectedRequestId) || requests[0] || null;

  const handleVerify = async (reqId: string) => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await orchestrator.verifyDeletion(reqId);
      setRequestEvidence(res);
      setShowEvidenceSection(true);
    } catch (err: any) {
      setVerificationError(err.message || 'Verification endpoint call failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadEvidence = async (reqId: string) => {
    try {
      const res = await orchestrator.getEvidenceForRequest(reqId);
      setRequestEvidence(res);
      setShowEvidenceSection(true);
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to retrieve evidence.');
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Page Title & Subtitle */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              model_training
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Machine Learning Unlearning &amp; Retraining Studio
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Evidence-driven model visualization, sample exclusion verification, and Membership Inference Attack (MIA) evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentRequest && (
            <button
              onClick={() => handleVerify(currentRequest.id)}
              disabled={isVerifying}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow active:scale-[0.99] transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isVerifying ? 'progress_activity' : 'task_alt'}
              </span>
              <span>Verify Deletion ({currentRequest.id})</span>
            </button>
          )}

          <button
            onClick={() => setIsComparisonOpen(true)}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-container rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow active:scale-[0.99] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">compare</span>
            <span>Inspect Model Metrics &amp; Audit</span>
          </button>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {models.map((m) => {
          const isSelected = m.id === selectedModelId;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedModelId(m.id)}
              className={`px-4 py-2.5 rounded-xl border text-left flex flex-col transition-all shrink-0 ${
                isSelected
                  ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary/30'
                  : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    m.trainingStatus === 'RETRAINING'
                      ? 'bg-amber-500 animate-ping'
                      : m.trainingStatus === 'PASSED'
                      ? 'bg-emerald-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className={`font-semibold text-xs ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                  {m.name}
                </span>
              </div>
              <span className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                {m.modelType} • {m.assignedAccelerator}
              </span>
            </button>
          );
        })}
      </div>

      {/* Associated Deletion Request Selector Bar */}
      {requests.length > 0 && (
        <div className="bg-surface-container-lowest px-4 py-2.5 rounded-xl border border-outline-variant/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">
              person_remove
            </span>
            <span className="font-semibold text-on-surface">Target Deletion Request Association:</span>
            <select
              value={selectedRequestId}
              onChange={(e) => {
                setSelectedRequestId(e.target.value);
                setShowEvidenceSection(false);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface font-mono focus:outline-none focus:border-primary"
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.customerName} ({r.customerId}) [{r.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {currentRequest && (
              <>
                <button
                  type="button"
                  onClick={() => handleLoadEvidence(currentRequest.id)}
                  className="text-primary hover:underline font-mono text-[11px] font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">policy</span>
                  <span>{showEvidenceSection ? 'Refresh Evidence' : 'Inspect Request Evidence'}</span>
                </button>

                {onInspectRequest && (
                  <button
                    type="button"
                    onClick={() => onInspectRequest(currentRequest)}
                    className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface font-mono text-[11px] font-semibold"
                  >
                    Open 8-Stage Audit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE ANIMATED NEURAL NETWORK VISUALIZER */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-on-surface font-semibold">
            <span className="material-symbols-outlined text-primary text-[18px]">neurology</span>
            <span>
              {currentModel?.isNeuralNetwork
                ? 'Synaptic Layer Topology Visualizer'
                : 'Decision Tree Ensemble Structure Visualizer'}
            </span>
          </div>
          <span className="font-mono text-label-sm text-on-surface-variant text-[11px]">
            Three selectable modes: Baseline, Retrained, or Before-and-After Comparison
          </span>
        </div>

        {currentModel && (
          <NeuralNetworkVisualizer
            model={currentModel}
            selectedRequest={currentRequest}
            compact={false}
            onOpenMetrics={() => setIsComparisonOpen(true)}
            onVerifyDeletion={handleVerify}
          />
        )}
      </div>

      {/* Request Evidence Panel (Collapsible directly on page) */}
      {showEvidenceSection && (
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                policy
              </span>
              <h2 className="font-headline-sm text-on-surface font-bold text-sm">
                Supporting Verification Evidence for {currentRequest?.id}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowEvidenceSection(false)}
              className="text-on-surface-variant hover:text-on-surface text-xs font-mono"
            >
              Hide Panel
            </button>
          </div>

          <DetailedEvidencePanel
            evidence={requestEvidence}
            onRunVerification={() => currentRequest && handleVerify(currentRequest.id)}
            isVerifying={isVerifying}
            verificationError={verificationError}
          />
        </div>
      )}

      {/* Live Model Training & Diagnostics Grid */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Model Evaluation &amp; Differential Privacy Status
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
            Updated: {currentModel.lastUpdated}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          {/* Card 1: DP-SGD */}
          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              DIFFERENTIAL PRIVACY BUDGET
            </span>
            <div className="flex items-baseline gap-2">
              {currentModel.dpSgdEpsilon !== undefined ? (
                <>
                  <span className="font-headline-sm text-on-surface font-mono font-bold">
                    ε = {currentModel.dpSgdEpsilon}
                  </span>
                  <span className="font-label-sm text-secondary font-mono">
                    (δ = {currentModel.dpSgdDelta || '1e-5'})
                  </span>
                </>
              ) : (
                <span className="text-body-sm text-on-surface-variant italic">
                  Not calibrated for this model
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Target differential privacy budget for gradient updates during model retraining.
            </p>
          </div>

          {/* Card 2: MIA Resistance */}
          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              MIA ATTACK RESISTANCE
            </span>
            <div className="flex items-baseline gap-2">
              {currentModel.miaResistance !== undefined ? (
                <>
                  <span className="font-headline-sm text-emerald-600 font-mono font-bold">
                    {currentModel.miaResistance}%
                  </span>
                  {currentModel.miaBaseline !== undefined && (
                    <span className="font-label-sm text-secondary font-mono">
                      (Baseline: {currentModel.miaBaseline}%)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-body-sm text-on-surface-variant italic">
                  Awaiting holdout evaluation
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Empirical Membership Inference Attack resistance measured on shadow models.
            </p>
          </div>

          {/* Card 3: Weight Delta Norm */}
          <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              WEIGHT VECTOR SHIFT
            </span>
            <div className="flex items-baseline gap-2">
              {currentModel.weightDeltaNorm !== undefined ? (
                <>
                  <span className="font-headline-sm text-primary font-mono font-bold">
                    ||ΔW||₂ = {currentModel.weightDeltaNorm}
                  </span>
                  <span className="font-label-sm text-secondary font-mono">L2 Norm</span>
                </>
              ) : (
                <span className="text-body-sm text-on-surface-variant italic">
                  Pending retrained checkpoint
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              L2 norm distance between baseline and retrained parameter vectors.
            </p>
          </div>
        </div>
      </div>

      {/* RETRAINING EXPERIMENTS & BATCHING SECTION */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Retraining Experiments &amp; Excluded Customer Sets
            </span>
          </div>
          <span className="font-mono text-label-sm text-primary bg-primary-fixed px-2 py-0.5 rounded font-bold">
            {experiments.length} Active Experiments
          </span>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
          Each batch experiment tracks the dataset snapshot, the exact customer identifiers excluded from the
          training corpus, and the resulting evaluation metrics.
        </p>

        <div className="space-y-3 pt-1">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-sm">{exp.id}</span>
                  <span className="font-semibold text-on-surface text-body-sm">{exp.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-on-surface-variant">
                    Dataset: <strong className="text-on-surface">{exp.datasetId}</strong>
                  </span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      exp.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-primary-fixed text-primary'
                    }`}
                  >
                    {exp.status}
                  </span>
                </div>
              </div>

              {/* Excluded Customers List */}
              <div className="space-y-1">
                <span className="font-label-sm text-on-surface-variant font-mono text-[11px] block">
                  Customer Identifiers Confirmed Excluded from Training Data:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {exp.excludedCustomerIds.map((cid) => (
                    <span
                      key={cid}
                      className="font-mono text-xs px-2.5 py-1 rounded bg-surface-container-lowest border border-outline-variant/40 text-primary font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">person_remove</span>
                      <span>{cid}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Associated Deletion Requests */}
              <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-xs text-on-surface-variant font-mono gap-2">
                <div className="flex items-center gap-2">
                  <span>Linked Deletion Jobs:</span>
                  {exp.associatedRequestIds.map((rId) => (
                    <span
                      key={rId}
                      className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface font-semibold"
                    >
                      {rId}
                    </span>
                  ))}
                </div>
                <div>
                  <span>Batch Size: <strong className="text-on-surface">{exp.batchSize}</strong></span> •{' '}
                  {exp.miaResistance !== undefined && (
                    <span>MIA Resistance: <strong className="text-emerald-600">{exp.miaResistance}%</strong></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Comparison Modal */}
      {currentModel && (
        <ModelComparisonModal
          model={currentModel}
          experiment={associatedExperiment}
          selectedRequest={currentRequest}
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          onVerifyDeletion={handleVerify}
        />
      )}
    </div>
  );
};
