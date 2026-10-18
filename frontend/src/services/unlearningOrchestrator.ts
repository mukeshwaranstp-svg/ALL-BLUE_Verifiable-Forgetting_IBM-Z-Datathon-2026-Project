import {
  Customer,
  DeletionRequest,
  MLModelMetadata,
  RetrainingExperiment,
  ZKPProofRecord,
  ImmutableReceipt,
  DashboardCounts,
  BackendConnectionStatus,
  DetailedDeletionEvidence,
  TimelineStage10,
  DataLocationTrace,
} from '../types';
import {
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_DELETION_REQUESTS,
  SYNTHETIC_MODELS,
  SYNTHETIC_EXPERIMENTS,
  SYNTHETIC_PROOFS,
  SYNTHETIC_RECEIPTS,
  createTruthfulStages,
  generateDetailedEvidence,
  create10StageTimeline,
  createDataLocationTrace,
} from './developmentFixtures';
import { apiClient, BulkSubmissionResult } from './apiClient';
export type { BulkSubmissionResult };

class OrchestratorService {
  private connectionStatus: BackendConnectionStatus = 'FIXTURE_MODE';
  private connectionError: string | null = null;
  private backendVersion: string | null = null;
  private backendTarget: string | null = null;

  // Local state cache loaded from backend or fixtures
  private customers: Customer[] = [...SYNTHETIC_CUSTOMERS];
  private requests: DeletionRequest[] = [...SYNTHETIC_DELETION_REQUESTS];
  private models: MLModelMetadata[] = [...SYNTHETIC_MODELS];
  private experiments: RetrainingExperiment[] = [...SYNTHETIC_EXPERIMENTS];
  private proofs: ZKPProofRecord[] = [...SYNTHETIC_PROOFS];
  private receipts: ImmutableReceipt[] = [...SYNTHETIC_RECEIPTS];
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  public async init() {
    if (apiClient.isConfigured()) {
      await this.connectBackend(apiClient.getBaseUrl());
    } else {
      this.connectionStatus = 'FIXTURE_MODE';
      this.notify();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getConnectionStatus(): BackendConnectionStatus {
    return this.connectionStatus;
  }

  public getConnectionError(): string | null {
    return this.connectionError;
  }

  public getBackendVersion(): string | null {
    return this.backendVersion;
  }

  public getBackendTarget(): string | null {
    return this.backendTarget;
  }

  public async connectBackend(url: string) {
    apiClient.setBaseUrl(url);
    this.connectionStatus = 'CONNECTING';
    this.connectionError = null;
    this.notify();

    try {
      const health = await apiClient.checkHealth();
      this.connectionStatus = 'CONNECTED';
      this.backendVersion = health.version;
      this.backendTarget = health.enclaveTarget || 'FastAPI Unlearning Engine';
      await this.refreshFromBackend();
    } catch (err: any) {
      this.connectionStatus = 'DISCONNECTED';
      this.connectionError = err.message || 'Failed to connect to backend service';
      // CRITICAL: NEVER silently fall back to mock data after a real API failure!
      this.notify();
    }
  }

  public switchToFixtureMode() {
    this.connectionStatus = 'FIXTURE_MODE';
    this.connectionError = null;
    this.customers = [...SYNTHETIC_CUSTOMERS];
    this.requests = [...SYNTHETIC_DELETION_REQUESTS];
    this.models = [...SYNTHETIC_MODELS];
    this.experiments = [...SYNTHETIC_EXPERIMENTS];
    this.proofs = [...SYNTHETIC_PROOFS];
    this.receipts = [...SYNTHETIC_RECEIPTS];
    this.notify();
  }

  public async refreshFromBackend(): Promise<void> {
    if (!apiClient.isConfigured() || this.connectionStatus === 'FIXTURE_MODE') {
      return;
    }

    try {
      const [customers, requests, models, experiments, proofs, receipts] = await Promise.all([
        apiClient.getCustomers().catch(() => this.customers),
        apiClient.getDeletionRequests().catch(() => this.requests),
        apiClient.getModels().catch(() => this.models),
        apiClient.getExperiments().catch(() => this.experiments),
        apiClient.getEvidence().catch(() => this.proofs),
        apiClient.getReceipts().catch(() => this.receipts),
      ]);

      this.customers = customers;
      this.requests = requests;
      this.models = models;
      this.experiments = experiments;
      this.proofs = proofs;
      this.receipts = receipts;
      this.connectionError = null;
      this.connectionStatus = 'CONNECTED';
      this.notify();
    } catch (err: any) {
      this.connectionStatus = 'DISCONNECTED';
      this.connectionError = `Backend refresh failed: ${err.message}`;
      this.notify();
      throw err;
    }
  }

  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public getRequests(): DeletionRequest[] {
    return [...this.requests];
  }

  public getModels(): MLModelMetadata[] {
    return [...this.models];
  }

  public getExperiments(): RetrainingExperiment[] {
    return [...this.experiments];
  }

  public getProofs(): ZKPProofRecord[] {
    return [...this.proofs];
  }

  public getReceipts(): ImmutableReceipt[] {
    return [...this.receipts];
  }

  public getCounts(): DashboardCounts {
    const total = this.requests.length;
    const awaitingProcessing = this.requests.filter(
      (r) => r.status === 'PENDING' && r.currentStage <= 2
    ).length;
    const inProgress = this.requests.filter(
      (r) => r.status === 'PENDING' && r.currentStage > 2
    ).length;
    const confirmed = this.requests.filter((r) => r.status === 'CONFIRMED').length;
    const failed = this.requests.filter((r) => r.status === 'FAILED').length;
    const requiringVerification = this.requests.filter(
      (r) => r.status === 'UNVERIFIED' || (r.status === 'PENDING' && r.currentStage === 7)
    ).length;

    return {
      total,
      awaitingProcessing,
      inProgress,
      confirmed,
      failed,
      requiringVerification,
    };
  }

  /**
   * Submit Bulk Deletion
   */
  public async submitBulkDeletion(selectedCustomerIds: string[]): Promise<BulkSubmissionResult> {
    if (this.connectionStatus === 'CONNECTED') {
      try {
        const result = await apiClient.submitBulkDeletion(selectedCustomerIds);
        await this.refreshFromBackend();
        return result;
      } catch (err: any) {
        this.connectionError = `Bulk deletion submission failed on backend: ${err.message}`;
        this.notify();
        throw err;
      }
    }

    // FIXTURE MODE IMPLEMENTATION (for Datathon demo & testing without active backend)
    const accepted: DeletionRequest[] = [];
    const rejected: Array<{ customerId: string; customerName?: string; reason: string }> = [];
    const uniqueIds = Array.from(new Set(selectedCustomerIds));
    const batchExperimentId =
      uniqueIds.length > 1 ? `EXP-TELUM-2026-B${Math.floor(10 + Math.random() * 89)}` : undefined;
    const acceptedCustomerIds: string[] = [];

    for (const id of uniqueIds) {
      const customer = this.customers.find((c) => c.id === id);
      if (!customer) {
        rejected.push({
          customerId: id,
          reason: 'Customer record not found in database index.',
        });
        continue;
      }

      if (!customer.eligibleForUnlearning) {
        rejected.push({
          customerId: id,
          customerName: customer.name,
          reason: customer.legalHoldReason || 'Statutory archive preservation hold active.',
        });
        continue;
      }

      const existingActive = this.requests.find(
        (r) => r.customerId === id && (r.status === 'PENDING' || r.status === 'UNVERIFIED')
      );
      if (existingActive) {
        rejected.push({
          customerId: id,
          customerName: customer.name,
          reason: `Active deletion job ${existingActive.id} currently in Stage 0${existingActive.currentStage}. Duplicate request rejected.`,
        });
        continue;
      }

      const newRequestId = `DEL-2026-${Math.floor(20000 + Math.random() * 79000)}`;
      const now = new Date();
      const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)} UTC`;

      const newRequest: DeletionRequest = {
        id: newRequestId,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        requestedAt: timestamp,
        status: 'PENDING',
        currentStage: 1,
        stageProgress: 12,
        databasePurgeStatus: 'IN_PROGRESS',
        tombstoneStatus: 'PENDING',
        backupWormStatus: 'PENDING',
        sandboxStatus: 'PENDING',
        featureStoreStatus: 'PENDING',
        modelUnlearningStatus: 'QUEUED',
        zkpProofStatus: 'PENDING',
        receiptStatus: 'PENDING',
        batchExperimentId: batchExperimentId || 'EXP-TELUM-2026-INDIV',
        modelRetrainedName: 'Customer-Credit-Scorer-v4',
        isSimulatedEvidence: true,
        stages: createTruthfulStages(1),
        merkleLeafHash: `0x${Array.from({ length: 40 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`,
        merkleTreeDepth: 24,
      };

      accepted.push(newRequest);
      acceptedCustomerIds.push(customer.id);
      customer.currentDeletionId = newRequestId;
    }

    if (accepted.length > 0) {
      this.requests = [...accepted, ...this.requests];

      if (batchExperimentId) {
        const newExp: RetrainingExperiment = {
          id: batchExperimentId,
          name: `Batch Unlearning Retraining #${batchExperimentId.slice(-2)}`,
          datasetId: 'DATASET-CREDIT-2026-Q3',
          modelId: 'mdl-credit-scorer-v4',
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          associatedRequestIds: accepted.map((a) => a.id),
          excludedCustomerIds: acceptedCustomerIds,
          batchSize: 128 * accepted.length,
          learningRate: 0.0012,
          noiseMultiplier: 1.25,
          unlearningVerificationScore: 99.2,
          miaResistance: 99.1,
        };
        this.experiments = [newExp, ...this.experiments];

        const targetModel = this.models.find((m) => m.id === 'mdl-credit-scorer-v4');
        if (targetModel) {
          targetModel.excludedCustomerIds = Array.from(
            new Set([...targetModel.excludedCustomerIds, ...acceptedCustomerIds])
          );
          targetModel.associatedExperimentId = batchExperimentId;
          targetModel.trainingStatus = 'RETRAINING';
          targetModel.trainingProgress = 20;
          targetModel.epochsCompleted = 10;
        }
      }

      this.notify();
    }

    return {
      accepted,
      rejected,
      batchExperimentId,
    };
  }

  /**
   * Advance Pipeline Phase
   */
  public async triggerNextPipelinePhase(): Promise<{ advancedCount: number; message: string }> {
    if (this.connectionStatus === 'CONNECTED') {
      try {
        const res = await apiClient.advancePipeline();
        await this.refreshFromBackend();
        return res;
      } catch (err: any) {
        this.connectionError = `Pipeline step failed on backend: ${err.message}`;
        this.notify();
        throw err;
      }
    }

    // FIXTURE MODE ADVANCE
    let advancedCount = 0;
    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)} UTC`;

    this.requests = this.requests.map((req) => {
      if (req.status !== 'PENDING' && req.status !== 'UNVERIFIED') {
        return req;
      }

      advancedCount++;
      const nextStage = Math.min(req.currentStage + 1, 8) as any;
      const progress = Math.min(100, Math.round((nextStage / 8) * 100));

      const updatedReq: DeletionRequest = {
        ...req,
        currentStage: nextStage,
        stageProgress: progress,
        stages: createTruthfulStages(nextStage),
      };

      if (nextStage >= 2) {
        updatedReq.databasePurgeStatus = 'PURGED';
        updatedReq.tombstoneStatus = 'INDEXED';
      }
      if (nextStage >= 3) {
        updatedReq.backupWormStatus = 'WORM_VERIFIED';
      }
      if (nextStage >= 4) {
        updatedReq.sandboxStatus = 'PASSED';
      }
      if (nextStage >= 5) {
        updatedReq.featureStoreStatus = 'EXCLUDED';
      }
      if (nextStage >= 6) {
        updatedReq.modelUnlearningStatus = 'UNLEARNED';
      }
      if (nextStage >= 7) {
        updatedReq.zkpProofStatus = 'GENERATED';
        if (!updatedReq.zkpProofHash) {
          updatedReq.zkpProofHash = `0x9f4a${Array.from({ length: 36 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('')}`;
        }
      }
      if (nextStage >= 8) {
        updatedReq.receiptStatus = 'MINTED';
        updatedReq.status = 'CONFIRMED';
        updatedReq.completedAt = timestamp;
        updatedReq.hsmSignature = `SPEC-Z16-SIG-${Math.floor(100000 + Math.random() * 900000).toString(16)}`;
        updatedReq.receiptId = `RCPT-2026-${req.customerId.replace('CUST-', '')}-ZK`;

        if (!this.proofs.find((p) => p.requestId === req.id)) {
          this.proofs.unshift({
            id: `ZKP-${Math.floor(100 + Math.random() * 900)}`,
            requestId: req.id,
            customerId: req.customerId,
            circuitType: 'Groth16 / BN254 (Simulation)',
            proofHash: updatedReq.zkpProofHash!,
            publicInputsHash: `0x${Array.from({ length: 32 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join('')}`,
            verificationKeyFingerprint: 'VK-BN254-TELUM-SPEC-2026',
            merkleRootPrePurge:
              '0x7a8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456',
            merkleRootPostPurge:
              '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789a',
            signerSpecification: 'IBM Crypto Express 8S Specification Archetype',
            createdAt: timestamp,
            verified: true,
            verificationLimitations:
              'Pre-production witness generated in testbed. Full ZK-SNARK proving requires target hardware key enclave.',
          });
        }

        if (!this.receipts.find((rc) => rc.requestId === req.id)) {
          this.receipts.unshift({
            receiptId: updatedReq.receiptId!,
            requestId: req.id,
            customerId: req.customerId,
            customerName: req.customerName,
            issuedAt: timestamp,
            enclaveTarget: 'IBM z16 Target Architecture (Enclave Specification)',
            keyId: 'HSM-KEY-SPEC-CRYPTO-EXPRESS-8S-SERIAL-09824',
            signatureR: `0x${Array.from({ length: 64 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join('')}`,
            signatureS: `0x${Array.from({ length: 64 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join('')}`,
            zkpProofHash: updatedReq.zkpProofHash!,
            datasetSnapshotHash: `0x${Array.from({ length: 32 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join('')}`,
            modelDeltaHash: `0x${Array.from({ length: 32 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join('')}`,
            status: 'VALID',
            isHardwareSigned: false,
            limitations:
              'Demonstration audit certificate. Physical tape snapshots are reconciled via cryptographic tombstone key revocation.',
            downloadableJson: JSON.stringify(
              {
                receiptId: updatedReq.receiptId,
                requestId: req.id,
                customerId: req.customerId,
                customerName: req.customerName,
                certification: 'Verifiable Unlearning Audit Record',
                zkpProofHash: updatedReq.zkpProofHash,
                hsmSignatureSpecification: updatedReq.hsmSignature,
                timestamp: timestamp,
                audit: 'PASSED - Excluded from Retraining Dataset',
              },
              null,
              2
            ),
          });
        }
      }

      return updatedReq;
    });

    this.notify();

    return {
      advancedCount,
      message:
        advancedCount > 0
          ? `Advanced ${advancedCount} deletion requests to the next pipeline stage.`
          : 'All active jobs have reached completion or are in terminal state.',
    };
  }

  /**
   * Retry failed request
   */
  public async retryFailedRequest(requestId: string): Promise<boolean> {
    if (this.connectionStatus === 'CONNECTED') {
      try {
        await apiClient.retryRequest(requestId);
        await this.refreshFromBackend();
        return true;
      } catch (err: any) {
        this.connectionError = `Retry failed on backend: ${err.message}`;
        this.notify();
        throw err;
      }
    }

    const target = this.requests.find((r) => r.id === requestId);
    if (!target) return false;

    target.status = 'PENDING';
    target.failureReason = undefined;
    target.backupWormStatus = 'SCANNING';
    target.currentStage = 3;
    target.stageProgress = 35;
    target.stages = createTruthfulStages(3);
    this.notify();
    return true;
  }

  /**
   * Get Evidence for a specific deletion request
   */
  public async getEvidenceForRequest(requestId: string): Promise<DetailedDeletionEvidence> {
    if (this.connectionStatus === 'CONNECTED') {
      try {
        return await apiClient.getRequestEvidence(requestId);
      } catch (err: any) {
        console.warn(`Backend evidence endpoint returned error: ${err.message}`);
        throw err;
      }
    }

    const request = this.requests.find((r) => r.id === requestId);
    if (!request) {
      throw new Error(`Deletion request ${requestId} not found.`);
    }
    const experiment = this.experiments.find(
      (e) => e.associatedRequestIds.includes(requestId) || e.id === request.batchExperimentId
    );
    const model =
      this.models.find(
        (m) =>
          m.associatedExperimentId === experiment?.id ||
          m.excludedCustomerIds.includes(request.customerId)
      ) || this.models[0];

    return generateDetailedEvidence(request, model, experiment);
  }

  /**
   * Verify Deletion: Evidence-driven verification action
   */
  public async verifyDeletion(requestId: string): Promise<DetailedDeletionEvidence> {
    if (this.connectionStatus === 'CONNECTED') {
      try {
        const evidence = await apiClient.verifyDeletion(requestId);
        await this.refreshFromBackend();
        return evidence;
      } catch (err: any) {
        const isNotFound =
          err.message && (err.message.includes('404') || err.message.includes('Not Found'));
        if (isNotFound) {
          throw new Error(
            `FastAPI verification endpoint POST /api/v1/deletions/${requestId}/verify is not implemented by the backend. Specification requirement: Backend must evaluate storage, backup revocation, dataset exclusion, and MIA resistance before returning verified evidence.`
          );
        }
        throw err;
      }
    }

    // FIXTURE MODE
    const request = this.requests.find((r) => r.id === requestId);
    if (!request) {
      throw new Error(`Deletion request ${requestId} not found.`);
    }

    const experiment = this.experiments.find(
      (e) => e.associatedRequestIds.includes(requestId) || e.id === request.batchExperimentId
    );
    const model =
      this.models.find(
        (m) =>
          m.associatedExperimentId === experiment?.id ||
          m.excludedCustomerIds.includes(request.customerId)
      ) || this.models[0];

    const evidence = generateDetailedEvidence(request, model, experiment);
    this.notify();
    return evidence;
  }

  /**
   * Submit Single Deletion Request (Simple Workflow Step C)
   */
  public async submitSingleDeletion(customerId: string): Promise<DeletionRequest> {
    const result = await this.submitBulkDeletion([customerId]);
    if (result.rejected && result.rejected.length > 0) {
      throw new Error(result.rejected[0].reason);
    }
    if (!result.accepted || result.accepted.length === 0) {
      throw new Error('Deletion request could not be accepted.');
    }
    return result.accepted[0];
  }

  /**
   * Get 10-Stage Timeline for Request (Requirement 3)
   */
  public get10StageTimeline(requestId: string): TimelineStage10[] {
    const request = this.requests.find((r) => r.id === requestId);
    if (!request) {
      return [];
    }
    return create10StageTimeline(request);
  }

  /**
   * Get Data Location Trace: "Where is the customer's data now?" (Requirement 4)
   */
  public getDataLocationTrace(requestId: string): DataLocationTrace[] {
    const request = this.requests.find((r) => r.id === requestId);
    if (!request) {
      return [];
    }
    return createDataLocationTrace(request);
  }

  public async getRequestStages(requestId: string): Promise<any> {
    if (this.connectionStatus === 'CONNECTED' && apiClient.isConfigured()) {
      try {
        return await apiClient.getRequestStages(requestId);
      } catch (err) {
        console.warn('Backend getRequestStages failed, using local timeline:', err);
      }
    }
    return this.get10StageTimeline(requestId);
  }

  public async getRequestProgress(requestId: string): Promise<any> {
    if (this.connectionStatus === 'CONNECTED' && apiClient.isConfigured()) {
      try {
        return await apiClient.getRequestProgress(requestId);
      } catch (err) {
        console.warn('Backend getRequestProgress failed:', err);
      }
    }
    const req = this.requests.find(r => r.id === requestId);
    return req ? { status: req.status, progress: req.stageProgress, currentStage: req.currentStage } : null;
  }

  public async getBaselineModelData(): Promise<MLModelMetadata> {
    if (this.connectionStatus === 'CONNECTED' && apiClient.isConfigured()) {
      try {
        return await apiClient.getBaselineModel();
      } catch (err) {
        console.warn('Backend getBaselineModel failed, using local model:', err);
      }
    }
    return this.models[0];
  }

  public async getRequestModelEvidenceData(requestId: string): Promise<any> {
    if (this.connectionStatus === 'CONNECTED' && apiClient.isConfigured()) {
      try {
        return await apiClient.getRequestModelEvidence(requestId);
      } catch (err) {
        console.warn('Backend getRequestModelEvidence failed:', err);
      }
    }
    const model = this.models[0];
    return { modelId: model.id, version: model.version, baselineVersion: model.baselineVersion, weightDeltaNorm: model.weightDeltaNorm, miaResistance: model.miaResistance };
  }

  public async getRequestVerificationData(requestId: string): Promise<DetailedDeletionEvidence> {
    return this.verifyDeletion(requestId);
  }

  public async getRequestReceiptData(requestId: string): Promise<ImmutableReceipt | null> {
    if (this.connectionStatus === 'CONNECTED' && apiClient.isConfigured()) {
      try {
        return await apiClient.getRequestReceipt(requestId);
      } catch (err) {
        console.warn('Backend getRequestReceipt failed, checking local receipts:', err);
      }
    }
    return this.receipts.find(r => r.requestId === requestId) || this.receipts[0] || null;
  }

  public async getRequestStorageEvidenceData(requestId: string): Promise<any> {
    if (this.connectionStatus === 'CONNECTED' && apiClient.isConfigured()) {
      try {
        return await apiClient.getRequestStorageEvidence(requestId);
      } catch (err) {
        console.warn('Backend getRequestStorageEvidence failed:', err);
      }
    }
    const trace = this.getDataLocationTrace(requestId);
    return { requestId, locations: trace };
  }

  public resetToDefault() {
    this.switchToFixtureMode();
  }
}

export const orchestrator = new OrchestratorService();
