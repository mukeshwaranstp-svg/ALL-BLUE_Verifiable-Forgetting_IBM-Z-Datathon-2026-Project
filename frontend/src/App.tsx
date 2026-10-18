import React, { useState, useEffect } from 'react';
import { orchestrator } from './services/unlearningOrchestrator';
import {
  Customer,
  DeletionRequest,
  MLModelMetadata,
  RetrainingExperiment,
  ZKPProofRecord,
  ImmutableReceipt,
  BackendConnectionStatus,
} from './types';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { SideDrawer } from './components/SideDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import { RequestDetailModal } from './components/RequestDetailModal';
import { ModelComparisonModal } from './components/ModelComparisonModal';
import { DashboardView } from './views/DashboardView';
import { CustomersView } from './views/CustomersView';
import { DeletionRequestsView } from './views/DeletionRequestsView';
import { ModelChangesView } from './views/ModelChangesView';
import { EvidenceReceiptsView } from './views/EvidenceReceiptsView';
import { StorageBackupView } from './views/StorageBackupView';
import { SettingsView } from './views/SettingsView';
import { LiveDeletionView } from './views/LiveDeletionView';

export default function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState<boolean>(false);

  // Orchestrator reactive state
  const [customers, setCustomers] = useState<Customer[]>(() => orchestrator.getCustomers());
  const [requests, setRequests] = useState<DeletionRequest[]>(() => orchestrator.getRequests());
  const [models, setModels] = useState<MLModelMetadata[]>(() => orchestrator.getModels());
  const [experiments, setExperiments] = useState<RetrainingExperiment[]>(() => orchestrator.getExperiments());
  const [proofs, setProofs] = useState<ZKPProofRecord[]>(() => orchestrator.getProofs());
  const [receipts, setReceipts] = useState<ImmutableReceipt[]>(() => orchestrator.getReceipts());
  const [counts, setCounts] = useState(() => orchestrator.getCounts());
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus>(() => orchestrator.getConnectionStatus());
  const [connectionError, setConnectionError] = useState<string | null>(() => orchestrator.getConnectionError());

  // Modal inspection states
  const [inspectedRequest, setInspectedRequest] = useState<DeletionRequest | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);

  const [comparedModel, setComparedModel] = useState<MLModelMetadata | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);

  // Subscribe to store
  useEffect(() => {
    const syncState = () => {
      setCustomers(orchestrator.getCustomers());
      setRequests(orchestrator.getRequests());
      setModels(orchestrator.getModels());
      setExperiments(orchestrator.getExperiments());
      setProofs(orchestrator.getProofs());
      setReceipts(orchestrator.getReceipts());
      setCounts(orchestrator.getCounts());
      setConnectionStatus(orchestrator.getConnectionStatus());
      setConnectionError(orchestrator.getConnectionError());
    };

    const unsubscribe = orchestrator.subscribe(syncState);
    return () => unsubscribe();
  }, []);

  const handleInspectRequest = (req: DeletionRequest) => {
    setInspectedRequest(req);
    setIsRequestModalOpen(true);
  };

  const handleRetryRequest = async (reqId: string) => {
    await orchestrator.retryFailedRequest(reqId);
    if (inspectedRequest && inspectedRequest.id === reqId) {
      const updated = orchestrator.getRequests().find((r) => r.id === reqId);
      if (updated) setInspectedRequest(updated);
    }
  };

  const handleOpenModelComparison = (model: MLModelMetadata) => {
    setComparedModel(model);
    setIsComparisonModalOpen(true);
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen">
      {/* Top Header */}
      <TopBar
        activeView={activeView}
        onOpenMenu={() => setIsSideDrawerOpen(true)}
        inFlightJobsCount={counts.inProgress + counts.awaitingProcessing}
        connectionStatus={connectionStatus}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 pt-20 pb-20 lg:pb-8">
        {/* Desktop Sidebar (lg screens) */}
        <DesktopSidebar
          activeView={activeView}
          onNavigate={(v) => {
            setActiveView(v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          counts={counts}
        />

        {/* Content Viewport */}
        <main className="flex-1 flex flex-col relative w-full px-margin max-w-7xl mx-auto py-2">
          {activeView === 'live-deletion' && (
            <LiveDeletionView
              customers={customers}
              requests={requests}
              models={models}
              onInspectRequest={handleInspectRequest}
            />
          )}

          {activeView === 'dashboard' && (
            <DashboardView
              requests={requests}
              models={models}
              counts={counts}
              connectionStatus={connectionStatus}
              connectionError={connectionError}
              onNavigate={(v) => {
                setActiveView(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onInspectRequest={handleInspectRequest}
              onOpenModelComparison={handleOpenModelComparison}
            />
          )}



          {activeView === 'customers' && (
            <CustomersView
              customers={customers}
              requests={requests}
              connectionStatus={connectionStatus}
              connectionError={connectionError}
              onNavigateToProgress={(reqId) => {
                setActiveView('deletion-requests');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onRetryConnection={async () => {
                try {
                  await orchestrator.refreshFromBackend();
                } catch (e) {}
              }}
            />
          )}

          {activeView === 'deletion-requests' && (
            <DeletionRequestsView
              customers={customers}
              requests={requests}
              onNavigateToCustomers={() => {
                setActiveView('customers');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeView === 'model-changes' && (
            <ModelChangesView
              models={models}
              experiments={experiments}
              requests={requests}
            />
          )}

          {activeView === 'evidence-receipts' && (
            <EvidenceReceiptsView proofs={proofs} receipts={receipts} />
          )}

          {activeView === 'storage-backup' && <StorageBackupView />}

          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeView={activeView}
        onNavigate={(v) => {
          setActiveView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenMenu={() => setIsSideDrawerOpen(true)}
      />

      {/* Side Navigation Drawer */}
      <SideDrawer
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        activeView={activeView}
        onNavigate={(v) => {
          setActiveView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Request Inspection Modal */}
      <RequestDetailModal
        request={inspectedRequest}
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onRetry={handleRetryRequest}
      />

      {/* Model Comparison Modal */}
      {comparedModel && (
        <ModelComparisonModal
          model={comparedModel}
          selectedRequest={inspectedRequest}
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
        />
      )}
    </div>
  );
}
