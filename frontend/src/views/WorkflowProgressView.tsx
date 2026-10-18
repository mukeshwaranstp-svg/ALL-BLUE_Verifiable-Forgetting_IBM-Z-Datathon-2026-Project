import React, { useState, useMemo } from 'react';
import { DeletionRequest } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';

interface WorkflowProgressViewProps {
  requests: DeletionRequest[];
  onInspectRequest: (req: DeletionRequest) => void;
  onRetryRequest: (requestId: string) => void;
}

export const WorkflowProgressView: React.FC<WorkflowProgressViewProps> = ({
  requests,
  onInspectRequest,
  onRetryRequest,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [pipelineFeedback, setPipelineFeedback] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter === 'ALL') return true;
      return r.status === statusFilter;
    });
  }, [requests, statusFilter]);

  const handleTriggerNext = async () => {
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

  const getSubsystemBadge = (status: string) => {
    switch (status) {
      case 'PURGED':
      case 'INDEXED':
      case 'WORM_VERIFIED':
      case 'PASSED':
      case 'EXCLUDED':
      case 'UNLEARNED':
      case 'GENERATED':
      case 'MINTED':
        return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'IN_PROGRESS':
      case 'SCANNING':
      case 'SYNCING':
      case 'RETRAINING':
      case 'COMPUTING':
      case 'SIGNING':
        return 'text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 animate-pulse';
      case 'FAILED':
      case 'FLAGGED':
        return 'text-error bg-error-container/40 border-error/40 font-bold';
      default:
        return 'text-on-surface-variant bg-surface-container-high border-outline-variant/30';
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Visual Imagery Component */}
      <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm bg-inverse-surface border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-[#0a192f] to-slate-900 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-inverse-surface/70 to-transparent p-space-md flex flex-col justify-end">
          <div className="flex items-center gap-space-xs text-tertiary-fixed-dim">
            <span className="material-symbols-outlined text-[16px]">memory</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-mono">
              Target Architecture: IBM Telum II AI Accelerator Array
            </span>
          </div>
          <p className="font-headline-md text-headline-md text-on-primary font-bold">
            End-to-End Verifiable Deletion Pipeline
          </p>
        </div>
      </div>

      {/* Notification feedback */}
      {pipelineFeedback && (
        <div className="p-3 bg-primary text-white rounded-lg text-body-sm font-semibold flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{pipelineFeedback}</span>
          </div>
          <button onClick={() => setPipelineFeedback(null)}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Telemetry Header */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="font-label-md text-label-md text-primary uppercase font-mono font-bold">
              Pipeline Engine #08
            </span>
          </div>
          <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded font-mono">
            Architecture: Z16 Dual-Socket
          </span>
        </div>
        <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Active In-Flight</span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold font-mono">
              {requests.filter((r) => r.status === 'PENDING').length}
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Jobs in queue</span>
          </div>
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Throughput</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-mono">
              142
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Req/hour</span>
          </div>
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Mean Cycle</span>
            <span className="font-headline-sm text-headline-sm text-tertiary font-bold font-mono">
              4.8m
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Target SLA: &lt;10.0m</span>
          </div>
        </div>
      </div>

      {/* 8-Phase Canonical Deletion Stepper */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              8-Stage Unlearning Matrix
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-space-xs py-0.5 rounded font-mono font-bold">
            Canonical Pipeline Spec
          </span>
        </div>

        {/* Stepper List */}
        <div className="flex flex-col gap-space-xs">
          {/* Stage 1 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                1
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Database Purge</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Live customer rows purged from database</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary text-[18px]">done_all</span>
          </div>

          {/* Stage 2 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                2
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Tombstone Registry</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Cryptographic tombstone entry recorded</span>
              </div>
            </div>
            <span className="bg-surface-container-highest text-primary font-label-sm text-label-sm px-space-xs py-0.5 rounded font-bold font-mono">INDEXED</span>
          </div>

          {/* Stage 3 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                3
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Backup WORM Scan</span>
                <span className="font-label-sm text-label-sm text-primary font-mono">Cryptographic erasure key reconciliation</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary animate-spin text-[18px]">sync</span>
          </div>

          {/* Stage 4 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                4
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Sandbox Verification</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Dynamic isolated regression tests</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          </div>

          {/* Stage 5 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                5
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Feature Store Scrub</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Feature embedding cache invalidation</span>
              </div>
            </div>
            <span className="font-label-sm text-label-sm text-secondary font-mono">ACTIVE</span>
          </div>

          {/* Stage 6 */}
          <div className="bg-primary/10 p-space-sm rounded-lg flex flex-col gap-space-xs border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                  6
                </div>
                <div className="flex flex-col">
                  <span className="font-body-md text-body-md font-bold text-primary">Model Retraining</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Target model retraining with excluded data</span>
                </div>
              </div>
              <span className="font-label-sm text-label-sm bg-primary text-on-primary px-space-xs py-0.5 rounded font-bold font-mono">
                STG 06
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-space-xs">
              <div className="bg-primary h-full w-[68%] transition-all duration-500" />
            </div>
          </div>

          {/* Stage 7 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                7
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Verification Audit</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">MIA attack resistance and witness verification</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-[18px]">lock_reset</span>
          </div>

          {/* Stage 8 */}
          <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-bold font-mono">
                8
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Receipt Issuance</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">Audit certificate creation and signing</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-[18px]">receipt_long</span>
          </div>
        </div>
      </div>

      {/* BULK WORKFLOW MONITORING MATRIX */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                table_chart
              </span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Bulk Workflow Progress Monitoring Matrix
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Independent lifecycle monitoring for each customer deletion job.
            </p>
          </div>

          {/* Filters for CONFIRMED, PENDING, FAILED, UNVERIFIED, RETAINED */}
          <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30 overflow-x-auto">
            {['ALL', 'CONFIRMED', 'PENDING', 'FAILED', 'UNVERIFIED', 'RETAINED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-mono">
              <tr>
                <th className="py-2.5 px-3">Request &amp; Customer</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Database Purge</th>
                <th className="py-2.5 px-3">Tombstone</th>
                <th className="py-2.5 px-3">Backup WORM</th>
                <th className="py-2.5 px-3">Feature Store</th>
                <th className="py-2.5 px-3">ML Retraining</th>
                <th className="py-2.5 px-3">Receipt</th>
                <th className="py-2.5 px-3">Overall Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-mono text-xs">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-primary">{req.id}</div>
                    <div className="text-[11px] font-sans text-on-surface font-semibold truncate max-w-[150px]">
                      {req.customerName}
                    </div>
                    <div className="text-[10px] text-on-surface-variant font-mono">{req.customerId}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-surface-container-high px-1.5 py-0.5 rounded font-bold text-on-surface">
                      0{req.currentStage}/08
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubsystemBadge(req.databasePurgeStatus)}`}>
                      {req.databasePurgeStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubsystemBadge(req.tombstoneStatus)}`}>
                      {req.tombstoneStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubsystemBadge(req.backupWormStatus)}`}>
                      {req.backupWormStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubsystemBadge(req.featureStoreStatus)}`}>
                      {req.featureStoreStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubsystemBadge(req.modelUnlearningStatus)}`}>
                      {req.modelUnlearningStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubsystemBadge(req.receiptStatus)}`}>
                      {req.receiptStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
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
                  <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                    {req.status === 'FAILED' && (
                      <button
                        onClick={() => onRetryRequest(req.id)}
                        className="px-2 py-1 bg-error text-white hover:bg-error/90 rounded text-[10px] font-semibold"
                        title="Retry Failed Stage"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => onInspectRequest(req)}
                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-semibold"
                      title="Verify Deletion Evidence"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => onInspectRequest(req)}
                      className="px-2 py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface text-[10px] font-semibold"
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

      {/* Trigger Next Pipeline Action Bar */}
      <div className="flex flex-col gap-space-xs pt-space-xs">
        <button
          onClick={handleTriggerNext}
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
      </div>
    </div>
  );
};
