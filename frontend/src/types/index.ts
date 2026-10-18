export type WorkflowStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type DeletionStatus = 'CONFIRMED' | 'PENDING' | 'FAILED' | 'UNVERIFIED' | 'RETAINED';

export type SubsystemStatus = 'PENDING' | 'ACTIVE' | 'PASSED' | 'FAILED' | 'FLAGGED';

export type BackendConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'FIXTURE_MODE';

export interface BackendHealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  enclaveTarget?: string;
  bulkSubmissionSupported: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  accountType: 'Retail' | 'Wealth' | 'Commercial' | 'Institutional';
  jurisdiction: 'GDPR (EU)' | 'CCPA (US)' | 'PIPEDA (CA)' | 'LGPD (BR)';
  riskTier: 'Low' | 'Medium' | 'High';
  recordsCount: number;
  datasetInclusionDate: string;
  eligibleForUnlearning: boolean;
  legalHoldReason?: string;
  currentDeletionId?: string;
  dataLocations?: string[]; // e.g. ['Active database', 'Backup copies', 'Training dataset']
}

export type Timeline10Status =
  | 'PENDING'
  | 'RUNNING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'UNVERIFIED'
  | 'RETAINED'
  | 'NOT_IMPLEMENTED';

export interface TimelineStage10 {
  stageNumber: number; // 1 to 10
  title: string;
  status: Timeline10Status;
  plainEnglishMeaning: string;
  actionPerformed: string;
  dataLocationChecked: string;
  timestamp?: string;
  evidenceResult?: string;
  error?: string;
  retryable?: boolean;
}

export interface DataLocationTrace {
  id: string;
  location: string;
  systemName: string;
  status: 'CONFIRMED' | 'FAILED' | 'UNVERIFIED' | 'PENDING' | 'RETAINED';
  resultLabel: string;
  evidenceSummary: string;
  technicalDetails: string;
  whatItProves: string;
  whatItDoesNotProve: string;
}

export interface StageDetail {
  stageNumber: WorkflowStageNumber;
  name: string;
  description: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  details: string;
  telemetryMetric?: string;
  error?: string;
}

export interface DeletionRequest {
  id: string; // e.g. DEL-2026-88319
  customerId: string;
  customerName: string;
  customerEmail: string;
  requestedAt: string;
  completedAt?: string;
  status: DeletionStatus;
  currentStage: WorkflowStageNumber;
  stageProgress: number; // 0-100%
  
  // Specific stage statuses for bulk monitoring matrix:
  databasePurgeStatus: 'PURGED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  tombstoneStatus: 'INDEXED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  backupWormStatus: 'WORM_VERIFIED' | 'SCANNING' | 'PENDING' | 'FLAGGED' | 'FAILED';
  sandboxStatus: 'PASSED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  featureStoreStatus: 'EXCLUDED' | 'SYNCING' | 'PENDING' | 'FAILED';
  modelUnlearningStatus: 'UNLEARNED' | 'RETRAINING' | 'QUEUED' | 'PENDING' | 'FAILED';
  zkpProofStatus: 'GENERATED' | 'COMPUTING' | 'PENDING' | 'FAILED';
  receiptStatus: 'MINTED' | 'SIGNING' | 'PENDING' | 'FAILED';

  // Retraining & batching metadata:
  batchExperimentId?: string; // e.g. EXP-TELUM-2026-B8
  modelRetrainedName?: string;
  modelVersion?: string;
  
  // Verification evidence:
  merkleLeafHash?: string;
  merkleTreeDepth?: number;
  zkpProofHash?: string;
  hsmSignature?: string;
  receiptId?: string;
  isSimulatedEvidence?: boolean;

  // Stages detailed breakdown:
  stages: StageDetail[];
  failureReason?: string;
}

export interface MLModelMetadata {
  id: string;
  name: string;
  modelType: 'Deep Neural Network' | 'Random Forest Ensemble' | 'Multi-Layer Perceptron';
  isNeuralNetwork: boolean;
  isIllustrativeArchitecture: boolean;
  architectureDescription: string;
  layerSizes: number[]; // e.g. [16, 24, 16, 2]
  version: string;
  baselineVersion: string;
  targetCustomerId?: string;
  assignedAccelerator: string; // e.g. "Target: IBM Telum Core #2"
  trainingStatus: 'RETRAINING' | 'PASSED' | 'QUEUED' | 'FAILED';
  trainingProgress: number; // percentage
  currentLoss: number;
  baselineLoss: number;
  dpSgdEpsilon?: number; // Differential Privacy ε (if calibrated)
  dpSgdDelta?: string;   // e.g. "1e-5"
  miaResistance?: number; // % e.g. 99.8%
  miaBaseline?: number;   // % e.g. 54.2%
  testAccuracyRetrained?: number; // % e.g. 94.6%
  testAccuracyBaseline?: number;  // % e.g. 95.1%
  weightDeltaNorm?: number; // e.g. 0.084
  epochsCompleted: number;
  totalEpochs: number;
  excludedCustomerIds: string[];
  associatedExperimentId: string;
  datasetId: string;
  lastUpdated: string;
  evaluationDatasetId?: string;
}

export interface RetrainingExperiment {
  id: string; // e.g. EXP-TELUM-2026-B8
  name: string;
  datasetId: string;
  modelId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'QUEUED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  associatedRequestIds: string[];
  excludedCustomerIds: string[];
  batchSize: number;
  learningRate: number;
  noiseMultiplier?: number; // DP noise
  unlearningVerificationScore?: number; // 0 - 100%
  miaResistance?: number;
  proofHash?: string;
}

export interface ZKPProofRecord {
  id: string;
  requestId: string;
  customerId: string;
  circuitType: 'Groth16 / BN254 (Simulation)' | 'PLONK / Telum Spec';
  proofHash: string;
  publicInputsHash: string;
  verificationKeyFingerprint: string;
  merkleRootPrePurge: string;
  merkleRootPostPurge: string;
  signerSpecification: string;
  createdAt: string;
  verified: boolean;
  verificationLimitations: string;
}

export interface ImmutableReceipt {
  receiptId: string;
  requestId: string;
  customerId: string;
  customerName: string;
  issuedAt: string;
  enclaveTarget: string;
  keyId: string;
  signatureR: string;
  signatureS: string;
  zkpProofHash: string;
  datasetSnapshotHash: string;
  modelDeltaHash: string;
  status: 'VALID' | 'PENDING' | 'REVOKED';
  isHardwareSigned: boolean;
  limitations: string;
  downloadableJson: string;
}

export interface DashboardCounts {
  total: number;
  awaitingProcessing: number;
  inProgress: number;
  confirmed: number;
  failed: number;
  requiringVerification: number;
}

export type VerificationCheckStatus = 'CONFIRMED' | 'PENDING' | 'FAILED' | 'UNVERIFIED' | 'RETAINED';

export interface EvidenceCheckItem {
  id: string;
  name: string;
  category: 'STORAGE' | 'ML' | 'VERIFICATION';
  status: VerificationCheckStatus;
  claim: string;
  resultSummary: string;
  timestamp?: string;
  evidenceReference?: string;
  artifactHash?: string;
  verifiedBy?: string;
  details: string;
  limitations?: string;
}

export interface DetailedDeletionEvidence {
  requestId: string;
  customerId: string;
  customerName: string;
  experimentId?: string;
  datasetId?: string;
  baselineModelId?: string;
  retrainedModelId?: string;
  overallStatus: DeletionStatus;
  verifiedAt?: string;
  isSimulatedEvidence?: boolean;
  
  // Storage evidence
  storage: {
    activeDbPurged: VerificationCheckStatus;
    dbVerificationResult: string;
    tombstoneIndexed: VerificationCheckStatus;
    tombstoneHash?: string;
    backupInspectionResult: string;
    backupRetainsData: boolean; // whether original backups still retain the customer record
    backupStatus: VerificationCheckStatus;
    isolatedRestoreResult: string;
    reconciliationMethod: string;
    checks: EvidenceCheckItem[];
  };

  // ML evidence
  ml: {
    trainingDatasetId: string;
    trainingDatasetVersion: string;
    baselineModelId: string;
    baselineModelVersion: string;
    exclusionOperationStatus: VerificationCheckStatus;
    exclusionCount?: number;
    customerAbsentFromDataset: VerificationCheckStatus;
    retrainedModelId: string;
    retrainedModelVersion: string;
    trainingCompletionStatus: VerificationCheckStatus;
    baselineMetrics?: {
      loss: number;
      accuracy?: number;
      miaBaseline?: number;
    };
    retrainedMetrics?: {
      loss: number;
      accuracy?: number;
      miaResistance?: number;
    };
    modelArtifactDeltaNorm?: number;
    forgettingVerificationStatus: VerificationCheckStatus;
    unlearningVerificationNotes: string;
    checks: EvidenceCheckItem[];
  };

  // Model transition timeline
  timeline: Array<{
    stepNumber: number;
    title: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
    timestamp?: string;
    description: string;
  }>;
}

