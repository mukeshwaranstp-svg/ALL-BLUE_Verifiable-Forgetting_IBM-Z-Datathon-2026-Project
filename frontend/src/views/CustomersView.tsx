import React, { useState, useMemo } from 'react';
import { Customer, DeletionRequest, BackendConnectionStatus } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';

interface CustomersViewProps {
  customers: Customer[];
  requests: DeletionRequest[];
  connectionStatus: BackendConnectionStatus;
  connectionError: string | null;
  onNavigateToProgress: (requestId: string) => void;
  onRetryConnection: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  requests,
  connectionStatus,
  connectionError,
  onNavigateToProgress,
  onRetryConnection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Review & Confirmation Modal state (Step B)
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesJurisdiction =
        jurisdictionFilter === 'ALL' || c.jurisdiction.startsWith(jurisdictionFilter);
      return matchesSearch && matchesJurisdiction;
    });
  }, [customers, searchQuery, jurisdictionFilter]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Existing active deletion request for selected customer if any
  const existingActiveRequest = useMemo(() => {
    if (!selectedCustomerId) return null;
    return requests.find(
      (r) =>
        r.customerId === selectedCustomerId &&
        (r.status === 'PENDING' || r.status === 'UNVERIFIED')
    );
  }, [requests, selectedCustomerId]);

  const handleStartReview = () => {
    if (!selectedCustomer) return;
    setSubmissionError(null);
    setIsReviewOpen(true);
  };

  const handleConfirmAndStart = async () => {
    if (!selectedCustomer || isSubmitting) return;

    if (connectionStatus === 'DISCONNECTED') {
      setSubmissionError(
        'Backend server is disconnected. Cannot submit live deletion requests while offline. Please verify backend connection or enable demo mode.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const createdRequest = await orchestrator.submitSingleDeletion(selectedCustomer.id);
      setIsReviewOpen(false);
      setSelectedCustomerId(null);
      // Automatically navigate to the dedicated Deletion Progress page
      onNavigateToProgress(createdRequest.id);
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit deletion request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Backend Disconnected Notice */}
      {connectionStatus === 'DISCONNECTED' && (
        <div className="p-4 bg-error-container/30 border border-error/40 text-on-surface rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[22px] mt-0.5">
              cloud_off
            </span>
            <div>
              <p className="font-semibold text-xs text-error">Live Backend Disconnected</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {connectionError || 'Cannot reach FastAPI backend server. Live deletion requests cannot be processed.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRetryConnection}
              className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-semibold text-on-surface flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              <span>Retry</span>
            </button>
            <button
              onClick={() => orchestrator.switchToFixtureMode()}
              className="px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container"
            >
              Switch to Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              person_search
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Find &amp; Select Customer for Deletion
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Step 1 of 3: Select a customer record below to initiate verifiable unlearning across the active database, backups, and ML models.
          </p>
        </div>

        {/* Selected Customer & Request Deletion Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedCustomer ? (
            <div className="flex flex-col items-end">
              <span className="font-mono text-xs font-bold text-on-surface">
                {selectedCustomer.name}
              </span>
              <span className="text-[11px] text-primary font-mono">
                {selectedCustomer.id} • {selectedCustomer.recordsCount.toLocaleString()} records
              </span>
            </div>
          ) : (
            <span className="text-xs text-on-surface-variant italic">
              No customer selected
            </span>
          )}

          <button
            type="button"
            onClick={handleStartReview}
            disabled={!selectedCustomer || !selectedCustomer.eligibleForUnlearning || !!existingActiveRequest}
            className="px-4 py-2.5 bg-primary text-white hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-body-sm font-semibold flex items-center gap-2 shadow-sm active:scale-[0.99] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
            <span>Request deletion</span>
          </button>
        </div>
      </div>

      {/* Active Deletion Notice if selected customer already has active job */}
      {existingActiveRequest && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px]">
              pending_actions
            </span>
            <span>
              <strong>Job in Progress:</strong> {selectedCustomer?.name} already has an active unlearning job (<strong>{existingActiveRequest.id}</strong> in Stage 0{existingActiveRequest.currentStage}).
            </span>
          </div>
          <button
            onClick={() => onNavigateToProgress(existingActiveRequest.id)}
            className="text-primary hover:underline font-bold text-xs shrink-0 ml-2"
          >
            Track Progress &rarr;
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by customer name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
          />
        </div>

        {/* Jurisdiction Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-on-surface-variant shrink-0 font-medium">Jurisdiction:</span>
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary font-mono w-full sm:w-auto"
          >
            <option value="ALL">All Jurisdictions</option>
            <option value="GDPR">GDPR (European Union)</option>
            <option value="CCPA">CCPA (United States)</option>
            <option value="PIPEDA">PIPEDA (Canada)</option>
            <option value="LGPD">LGPD (Brazil)</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body-sm">
            <thead className="bg-surface-container-high/60 border-b border-outline-variant/30 text-on-surface-variant font-mono">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Select</th>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Customer Name &amp; Email</th>
                <th className="py-3 px-4">Associated Records</th>
                <th className="py-3 px-4">Data Locations Involved</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[32px] block mb-1">
                      search_off
                    </span>
                    No customers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  const activeJob = requests.find(
                    (r) => r.customerId === c.id && (r.status === 'PENDING' || r.status === 'UNVERIFIED')
                  );
                  const confirmedJob = requests.find(
                    (r) => r.customerId === c.id && r.status === 'CONFIRMED'
                  );

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      {/* Radio Selection */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="radio"
                          name="selectedCustomer"
                          checked={isSelected}
                          onChange={() => setSelectedCustomerId(c.id)}
                          className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      {/* Customer ID */}
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {c.id}
                      </td>

                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-on-surface block">{c.name}</span>
                        <span className="text-[11px] text-on-surface-variant font-mono">{c.email}</span>
                      </td>

                      {/* Records Count */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-on-surface">
                          {c.recordsCount.toLocaleString()}
                        </span>
                        <span className="text-on-surface-variant text-[11px] block">
                          transational records
                        </span>
                      </td>

                      {/* Data Locations Involved */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] text-on-surface font-mono">
                            Active Database
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] text-on-surface font-mono">
                            WORM Backups
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] text-on-surface font-mono">
                            Training Set
                          </span>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="py-3 px-4">
                        {!c.eligibleForUnlearning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-on-error-container">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            <span>Legal Hold</span>
                          </span>
                        ) : activeJob ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <span className="material-symbols-outlined text-[12px] animate-spin">
                              sync
                            </span>
                            <span>In Progress (Stage 0{activeJob.currentStage})</span>
                          </span>
                        ) : confirmedJob ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            <span>Verified Deleted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active (Eligible)</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {activeJob ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToProgress(activeJob.id)}
                            className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-primary text-[11px] font-semibold"
                          >
                            View Progress
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              handleStartReview();
                            }}
                            disabled={!c.eligibleForUnlearning}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed rounded text-[11px] font-semibold shadow-xs"
                          >
                            Select &amp; Request
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STEP B: REVIEW & CONFIRMATION MODAL */}
      {isReviewOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsReviewOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-high/60 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  fact_check
                </span>
                <div>
                  <h2 className="font-headline-sm text-on-surface font-bold text-base">
                    Step 2 of 3: Review Deletion Request
                  </h2>
                  <p className="font-label-sm text-on-surface-variant text-xs">
                    Please review what will happen before submitting this request to the unlearning engine.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsReviewOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-body-sm text-on-surface">
              {submissionError && (
                <div className="p-3 bg-error-container/40 border border-error/50 rounded-lg text-on-error-container flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-[18px] mt-0.5">
                    error
                  </span>
                  <div>
                    <strong className="block">Submission Error:</strong>
                    <span>{submissionError}</span>
                  </div>
                </div>
              )}

              {/* 1. Which customer is selected? */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1.5">
                <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Target Customer Identity
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Name:</span>
                    <strong className="text-on-surface text-sm">{selectedCustomer.name}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Customer ID:</span>
                    <strong className="text-primary font-mono text-sm">{selectedCustomer.id}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Email:</span>
                    <span className="font-mono text-on-surface">{selectedCustomer.email}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Jurisdiction:</span>
                    <span className="font-mono text-on-surface">{selectedCustomer.jurisdiction}</span>
                  </div>
                </div>
              </div>

              {/* 2. What data is targeted? */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1">
                <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Target Data Scope
                </span>
                <p className="text-on-surface leading-relaxed">
                  Targeting <strong>{selectedCustomer.recordsCount.toLocaleString()}</strong> historical transaction rows, customer profile records, and machine-learning feature vectors.
                </p>
              </div>

              {/* 3. Which systems will be checked? */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1.5">
                <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Systems &amp; Environments Involved
                </span>
                <ul className="list-disc pl-4 space-y-1 text-on-surface-variant">
                  <li><strong className="text-on-surface">Active Transactional Database:</strong> Records will be deleted permanently, and a cryptographic tombstone marker will be inserted.</li>
                  <li><strong className="text-on-surface">Immutable WORM Backups:</strong> Inspected for historical copies. Due to physical write-once tape retention, historical bytes are preserved; access is revoked by zeroizing decryption keys.</li>
                  <li><strong className="text-on-surface">Disaster Recovery Sandbox:</strong> Simulated restore test ensures database restores do not resurrect this customer.</li>
                  <li><strong className="text-on-surface">ML Training Dataset:</strong> Customer excluded from dataset partition snapshots.</li>
                  <li><strong className="text-on-surface">AI Model Weights:</strong> New model retrained from scratch on IBM Telum II hardware without this customer.</li>
                </ul>
              </div>

              {/* 4. What actions will the application perform? */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1.5">
                <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Timeline Expectations
                </span>
                <p className="text-on-surface-variant leading-relaxed">
                  The deletion pipeline runs through 10 distinct verification stages. The system guarantees full traceability: every change is backed by an inspectable check, and unsupported or failed stages will never be disguised as successful.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface-container-high/60 border-t border-outline-variant/30 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-semibold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAndStart}
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-primary-container disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Confirm &amp; Start Deletion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
