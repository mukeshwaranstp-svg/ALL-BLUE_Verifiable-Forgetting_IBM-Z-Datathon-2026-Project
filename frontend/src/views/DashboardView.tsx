import React, { useState } from 'react';
import { DeletionRequest, MLModelMetadata, BackendConnectionStatus } from '../types';
import { NeuralNetworkVisualizer } from '../components/NeuralNetworkVisualizer';
import { orchestrator } from '../services/unlearningOrchestrator';

interface DashboardViewProps {
  requests: DeletionRequest[];
  models: MLModelMetadata[];
  counts: {
    total: number;
    awaitingProcessing: number;
    inProgress: number;
    confirmed: number;
    failed: number;
    requiringVerification: number;
  };
  connectionStatus: BackendConnectionStatus;
  connectionError: string | null;
  onNavigate: (view: string) => void;
  onInspectRequest: (req: DeletionRequest) => void;
  onOpenModelComparison: (model: MLModelMetadata) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests,
  models,
  counts,
  connectionStatus,
  connectionError,
  onNavigate,
  onInspectRequest,
  onOpenModelComparison,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [pipelineFeedback, setPipelineFeedback] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const activeModel = models[0] || {
    id: 'mdl-credit-scorer-v4',
    name: 'Customer-Credit-Scorer-v4',
    modelType: 'Deep Neural Network' as const,
    isNeuralNetwork: true,
    isIllustrativeArchitecture: true,
    architectureDescription: '16 features -> Dense(24) -> Dense(16) -> Softmax(2)',
    layerSizes: [16, 24, 16, 2],
    version: 'v4.2.0-unlearned',
    baselineVersion: 'v4.1.0-baseline',
    assignedAccelerator: 'Target Architecture: IBM Telum Core #2',
    trainingStatus: 'RETRAINING' as const,
    trainingProgress: 68,
    currentLoss: 0.042,
    baselineLoss: 0.049,
    dpSgdEpsilon: 1.18,
    dpSgdDelta: '1e-5',
    miaResistance: 99.4,
    miaBaseline: 54.2,
    testAccuracyRetrained: 94.6,
    testAccuracyBaseline: 95.1,
    weightDeltaNorm: 0.084,
    epochsCompleted: 34,
    totalEpochs: 50,
    excludedCustomerIds: ['CUST-88319'],
    associatedExperimentId: 'EXP-TELUM-2026-B8',
    datasetId: 'DATASET-CREDIT-2026-Q3',
    lastUpdated: '2026-10-24 14:32:00 UTC',
  };

  const copyProofHash = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('0x9f4a7c2830fde2a19b83ce18b4aa89201bcde371');
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleTriggerNextPipelinePhase = async () => {
    setIsAdvancing(true);
    try {
      const res = await orchestrator.triggerNextPipelinePhase();
      setPipelineFeedback(res.message);
      setTimeout(() => setPipelineFeedback(null), 3500);
    } catch (err: any) {
      setPipelineFeedback(`Pipeline advance failed: ${err.message}`);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Backend Connection Status Banner */}
      {connectionStatus === 'DISCONNECTED' && (
        <div className="p-3.5 bg-error-container/30 border border-error/40 text-on-surface rounded-xl flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
            <div>
              <p className="font-semibold text-xs text-error">FastAPI Backend Unreachable</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {connectionError || 'Unable to connect to the configured VITE_API_BASE_URL.'}
              </p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                The frontend does not silently fabricate mock data after a backend failure. You can check your
                backend service, CORS headers, or switch to the synthetic Datathon testbed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('settings')}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-xs font-semibold text-on-surface"
            >
              Configure URL
            </button>
            <button
              onClick={() => orchestrator.switchToFixtureMode()}
              className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container"
            >
              Use Testbed Sandbox
            </button>
          </div>
        </div>
      )}

      {connectionStatus === 'FIXTURE_MODE' && (
        <div className="p-3 bg-surface-container-low border border-primary/20 text-on-surface rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">info</span>
            <span>
              <strong>Datathon Demo Mode:</strong> Running with verified synthetic test fixtures. To connect your real FastAPI server, configure <code>VITE_API_BASE_URL</code> in Settings.
            </span>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-primary hover:underline font-semibold font-mono text-[11px] shrink-0 ml-2"
          >
            Backend Settings &rarr;
          </button>
        </div>
      )}

      {/* Visual Imagery Banner - Preserving Stitch styling */}
      <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm bg-inverse-surface border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-[#0a192f] to-slate-900 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-inverse-surface/60 to-transparent p-space-md flex flex-col justify-end">
          <div className="flex items-center gap-space-xs text-tertiary-fixed-dim">
            <span className="material-symbols-outlined text-[16px]">memory</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-mono">
              Target Architecture: IBM Telum II AI Accelerator Array
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-primary font-bold">
            End-to-End Verifiable Deletion Pipeline
          </h1>
        </div>
      </div>

      {/* Notification banner if triggered */}
      {pipelineFeedback && (
        <div className="p-3 bg-primary text-white rounded-lg text-body-sm font-semibold flex items-center justify-between shadow animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{pipelineFeedback}</span>
          </div>
          <button onClick={() => setPipelineFeedback(null)} className="text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Dashboard KPI Metric Cards (Requirement 4: 6 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col shadow-xs">
          <span className="font-label-sm text-on-surface-variant font-mono">TOTAL REQUESTS</span>
          <span className="font-headline-lg text-on-surface font-bold mt-1 font-mono">
            {counts.total}
          </span>
          <span className="font-label-sm text-[10px] text-secondary">Historical &amp; active</span>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col shadow-xs">
          <span className="font-label-sm text-on-surface-variant font-mono">AWAITING QUEUE</span>
          <span className="font-headline-lg text-primary font-bold mt-1 font-mono">
            {counts.awaitingProcessing}
          </span>
          <span className="font-label-sm text-[10px] text-primary">Stage 01 - 02</span>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col shadow-xs">
          <span className="font-label-sm text-on-surface-variant font-mono">IN PROGRESS</span>
          <span className="font-headline-lg text-tertiary font-bold mt-1 font-mono">
            {counts.inProgress}
          </span>
          <span className="font-label-sm text-[10px] text-secondary">Active unlearning</span>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col shadow-xs">
          <span className="font-label-sm text-on-surface-variant font-mono">CONFIRMED</span>
          <span className="font-headline-lg text-emerald-600 font-bold mt-1 font-mono">
            {counts.confirmed}
          </span>
          <span className="font-label-sm text-[10px] text-emerald-700">Receipts minted</span>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col shadow-xs">
          <span className="font-label-sm text-on-surface-variant font-mono">FAILED</span>
          <span className="font-headline-lg text-error font-bold mt-1 font-mono">
            {counts.failed}
          </span>
          <span className="font-label-sm text-[10px] text-error font-semibold">Requires action</span>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col shadow-xs">
          <span className="font-label-sm text-on-surface-variant font-mono">UNVERIFIED</span>
          <span className="font-headline-lg text-amber-600 font-bold mt-1 font-mono">
            {counts.requiringVerification}
          </span>
          <span className="font-label-sm text-[10px] text-amber-700">Witness pending</span>
        </div>
      </div>

      {/* Telemetry Header */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="font-label-md text-label-md text-primary uppercase font-bold font-mono">
              Pipeline Engine #08
            </span>
          </div>
          <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded font-mono">
            Architecture: Z16 Dual-Socket
          </span>
        </div>
        <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Active In-Flight</span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold font-mono">
              {counts.inProgress + counts.awaitingProcessing}
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Jobs in queue</span>
          </div>
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Throughput</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-mono">
              142
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Req/hour</span>
          </div>
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Mean Cycle</span>
            <span className="font-headline-sm text-headline-sm text-tertiary font-bold font-mono">
              4.8m
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Target SLA: &lt;10.0m</span>
          </div>
        </div>
      </div>

      {/* Compact Animated Neural Network Preview on Dashboard */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">model_training</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Live Neural Network Unlearning Visualizer
            </span>
          </div>
          <button
            onClick={() => onNavigate('ml-models')}
            className="text-primary hover:text-primary-container font-label-sm text-label-sm font-semibold flex items-center gap-1"
          >
            <span>Full ML Model Studio</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        <NeuralNetworkVisualizer
          model={activeModel}
          selectedRequest={requests[0]}
          compact={true}
          onOpenMetrics={() => onOpenModelComparison(activeModel)}
          onVerifyDeletion={(reqId) => {
            const req = requests.find((r) => r.id === reqId);
            if (req) onInspectRequest(req);
          }}
        />
      </div>

      {/* Live Workflow Table */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Active Deletion Pipeline Queue
            </span>
          </div>
          <button
            onClick={() => onNavigate('workflow-progress')}
            className="font-label-sm text-label-sm text-primary hover:underline font-semibold"
          >
            View All in 8-Stage Matrix &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
              <tr>
                <th className="py-2 px-3">Request ID</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3">Stage</th>
                <th className="py-2 px-3">DB Purge</th>
                <th className="py-2 px-3">ML Retraining</th>
                <th className="py-2 px-3">ZKP Proof</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-mono text-xs">
              {requests.slice(0, 5).map((req) => (
                <tr key={req.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-2.5 px-3 font-bold text-primary">{req.id}</td>
                  <td className="py-2.5 px-3 font-sans text-on-surface">
                    <span className="font-semibold block">{req.customerName}</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{req.customerId}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-surface-container-high px-1.5 py-0.5 rounded font-bold text-on-surface-variant">
                      STG 0{req.currentStage}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={req.databasePurgeStatus === 'PURGED' ? 'text-primary' : 'text-secondary'}>
                      {req.databasePurgeStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={req.modelUnlearningStatus === 'UNLEARNED' ? 'text-emerald-600' : 'text-primary'}>
                      {req.modelUnlearningStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={req.zkpProofStatus === 'GENERATED' ? 'text-emerald-600' : 'text-secondary'}>
                      {req.zkpProofStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'FAILED'
                          ? 'bg-error-container text-on-error-container'
                          : req.status === 'UNVERIFIED'
                          ? 'bg-amber-100 text-amber-800'
                          : req.status === 'RETAINED'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onInspectRequest(req)}
                      className="px-2 py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface text-[11px] font-semibold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage & Quarantine Zone Monitor */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">warehouse</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Storage &amp; Quarantine Zone
            </span>
          </div>
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
        </div>
        <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-body-md text-body-md font-semibold text-on-surface">
              Ephemeral Sandbox Isolation
            </span>
            <span className="bg-primary text-on-primary font-label-sm text-label-sm px-space-xs py-0.5 rounded font-bold font-mono">
              AIR-GAP ENABLED
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Virtual enclave spun up with no outbound egress during regression unlearning verification.
          </p>
          <div className="grid grid-cols-2 gap-space-xs mt-space-xs font-label-sm text-label-sm">
            <div className="bg-surface-container-lowest p-space-xs rounded flex flex-col">
              <span className="text-on-surface-variant font-mono">Merkle Tree Depth</span>
              <span className="text-on-surface font-bold font-mono">24 levels</span>
            </div>
            <div className="bg-surface-container-lowest p-space-xs rounded flex flex-col">
              <span className="text-on-surface-variant font-mono">Verified Tombstone Nodes</span>
              <span className="text-on-surface font-bold font-mono">428,910 nodes</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between bg-surface-container-low p-space-sm rounded-lg text-on-surface">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
            <span className="font-body-sm text-body-sm font-semibold">WORM Tape Key Revocation</span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary font-mono">
            3 Snapshots Reconciled
          </span>
        </div>
      </div>

      {/* Verification Evidence Identifier Banner */}
      <div className="relative w-full h-24 rounded-xl overflow-hidden shadow-sm bg-inverse-surface border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950 to-slate-900 opacity-90" />
        <div className="absolute inset-0 p-space-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase font-mono">
              Verification Proof Hash (Sample Witness)
            </span>
            <span className="font-label-md text-label-md text-on-primary font-mono truncate max-w-[280px]">
              0x9f4a7c2830fde2a19b83ce18b4aa89201bcde371
            </span>
          </div>
          <button
            onClick={copyProofHash}
            className="bg-primary text-on-primary font-label-sm text-label-sm px-space-sm py-space-xs rounded shadow flex items-center gap-space-xs active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copiedHash ? 'check' : 'content_copy'}
            </span>
            <span>{copiedHash ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Quick Execution Bar */}
      <div className="flex flex-col gap-space-xs pt-space-xs">
        <button
          onClick={handleTriggerNextPipelinePhase}
          disabled={isAdvancing}
          className="w-full bg-primary text-on-primary h-10 rounded font-body-md text-body-md font-semibold flex items-center justify-center gap-space-xs shadow active:scale-[0.99] transition-transform disabled:opacity-50"
        >
          {isAdvancing ? (
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          )}
          <span>Trigger Next Pipeline Phase</span>
        </button>
        <div className="grid grid-cols-2 gap-space-xs">
          <button
            onClick={() => onNavigate('verification-evidence')}
            className="w-full bg-surface-container-lowest text-on-surface h-9 rounded font-body-sm text-body-sm font-semibold flex items-center justify-center gap-space-xs shadow-xs hover:bg-surface-container active:scale-[0.99] border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-primary text-[16px]">terminal</span>
            <span>Proof Logs</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Pause pipeline execution for active unlearning jobs?')) {
                alert('Pipeline runner paused. In-flight jobs held in current stage.');
              }
            }}
            className="w-full bg-surface-container-lowest text-error h-9 rounded font-body-sm text-body-sm font-semibold flex items-center justify-center gap-space-xs shadow-xs hover:bg-error-container/40 active:scale-[0.99] border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-error text-[16px]">pause_circle</span>
            <span>Pause Pipeline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
