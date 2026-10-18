import {
  Customer,
  DeletionRequest,
  MLModelMetadata,
  RetrainingExperiment,
  ZKPProofRecord,
  ImmutableReceipt,
  DashboardCounts,
  BackendHealthResponse,
  DetailedDeletionEvidence,
} from '../types';

export interface BulkSubmissionResult {
  accepted: DeletionRequest[];
  rejected: Array<{
    customerId: string;
    customerName?: string;
    reason: string;
  }>;
  batchExperimentId?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').trim();
    // Normalize trailing slash
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.trim().replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.baseUrl) {
      throw new Error(
        'Backend URL not configured. Set VITE_API_BASE_URL in your environment or Settings.'
      );
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API request to ${endpoint} failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Health Check: GET /health or GET /api/v1/health
   */
  public async checkHealth(): Promise<BackendHealthResponse> {
    try {
      return await this.request<BackendHealthResponse>('/api/v1/health');
    } catch {
      // Fallback check root /health
      return await this.request<BackendHealthResponse>('/health');
    }
  }

  /**
   * Customers: GET /api/v1/customers
   */
  public async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/api/v1/customers');
  }

  /**
   * Dashboard Summary: GET /api/v1/dashboard/summary
   */
  public async getDashboardSummary(): Promise<DashboardCounts> {
    return this.request<DashboardCounts>('/api/v1/dashboard/summary');
  }

  /**
   * Deletion Requests: GET /api/v1/deletions
   */
  public async getDeletionRequests(status?: string): Promise<DeletionRequest[]> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<DeletionRequest[]>(`/api/v1/deletions${query}`);
  }

  /**
   * Deletion Request Detail: GET /api/v1/deletions/:id
   */
  public async getDeletionDetail(requestId: string): Promise<DeletionRequest> {
    return this.request<DeletionRequest>(`/api/v1/deletions/${encodeURIComponent(requestId)}`);
  }

  /**
   * Submit Single Deletion: POST /api/v1/deletions
   */
  public async submitDeletion(customerId: string): Promise<DeletionRequest> {
    return this.request<DeletionRequest>('/api/v1/deletions', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  }

  /**
   * Submit Bulk Deletions: POST /api/v1/deletions/bulk
   * If the backend lacks a bulk endpoint, gracefully fall back to individual requests
   * without fabricating fake bulk results.
   */
  public async submitBulkDeletion(customerIds: string[]): Promise<BulkSubmissionResult> {
    try {
      return await this.request<BulkSubmissionResult>('/api/v1/deletions/bulk', {
        method: 'POST',
        body: JSON.stringify({ customerIds }),
      });
    } catch (err: any) {
      // If 404/not supported, process individually through /api/v1/deletions
      if (err.message && err.message.includes('404')) {
        console.warn('Backend lacks /api/v1/deletions/bulk. Submitting via individual endpoints...');
        const accepted: DeletionRequest[] = [];
        const rejected: Array<{ customerId: string; reason: string }> = [];

        await Promise.all(
          customerIds.map(async (cid) => {
            try {
              const req = await this.submitDeletion(cid);
              accepted.push(req);
            } catch (singleErr: any) {
              rejected.push({
                customerId: cid,
                reason: singleErr.message || 'Individual request submission failed',
              });
            }
          })
        );

        return { accepted, rejected };
      }
      throw err;
    }
  }

  /**
   * Retry Failed Stage: POST /api/v1/deletions/:id/retry
   */
  public async retryRequest(requestId: string): Promise<DeletionRequest> {
    return this.request<DeletionRequest>(`/api/v1/deletions/${encodeURIComponent(requestId)}/retry`, {
      method: 'POST',
    });
  }

  /**
   * Trigger Pipeline Phase: POST /api/v1/pipeline/advance
   */
  public async advancePipeline(): Promise<{ advancedCount: number; message: string }> {
    return this.request<{ advancedCount: number; message: string }>('/api/v1/pipeline/advance', {
      method: 'POST',
    });
  }

  /**
   * ML Models: GET /api/v1/models
   */
  public async getModels(): Promise<MLModelMetadata[]> {
    return this.request<MLModelMetadata[]>('/api/v1/models');
  }

  /**
   * ML Experiments: GET /api/v1/experiments
   */
  public async getExperiments(): Promise<RetrainingExperiment[]> {
    return this.request<RetrainingExperiment[]>('/api/v1/experiments');
  }

  /**
   * Verification Evidence: GET /api/v1/evidence
   */
  public async getEvidence(): Promise<ZKPProofRecord[]> {
    return this.request<ZKPProofRecord[]>('/api/v1/evidence');
  }

  /**
   * Immutable Receipts: GET /api/v1/receipts
   */
  public async getReceipts(): Promise<ImmutableReceipt[]> {
    return this.request<ImmutableReceipt[]>('/api/v1/receipts');
  }

  /**
   * Single Receipt: GET /api/v1/receipts/:id
   */
  public async getReceipt(receiptId: string): Promise<ImmutableReceipt> {
    return this.request<ImmutableReceipt>(`/api/v1/receipts/${encodeURIComponent(receiptId)}`);
  }

  /**
   * Verify Deletion: POST /api/v1/deletions/:id/verify
   * Triggers or queries backend verification of storage, backup, dataset exclusion, and ML unlearning.
   */
  public async verifyDeletion(requestId: string): Promise<DetailedDeletionEvidence> {
    return this.request<DetailedDeletionEvidence>(`/api/v1/deletions/${encodeURIComponent(requestId)}/verify`, {
      method: 'POST',
    });
  }

  /**
   * Workflow Stages: prefer V1 camelCase, fallback to legacy snake_case
   */
  public async getRequestStages(requestId: string): Promise<any> {
    try {
      return await this.request<any>(`/api/v1/deletions/${encodeURIComponent(requestId)}/stages`);
    } catch {
      return await this.request<any>(`/api/requests/${encodeURIComponent(requestId)}/stages`);
    }
  }

  /**
   * Workflow Progress: prefer V1 camelCase, fallback to legacy
   */
  public async getRequestProgress(requestId: string): Promise<any> {
    try {
      return await this.request<any>(`/api/v1/deletions/${encodeURIComponent(requestId)}/progress`);
    } catch {
      return await this.request<any>(`/api/requests/${encodeURIComponent(requestId)}/progress`);
    }
  }

  /**
   * Baseline Model: prefer V1 camelCase, fallback to legacy
   */
  public async getBaselineModel(): Promise<MLModelMetadata> {
    try {
      return await this.request<MLModelMetadata>('/api/v1/models/baseline');
    } catch {
      return await this.request<MLModelMetadata>('/api/models/baseline');
    }
  }

  /**
   * Model Evidence: prefer V1 camelCase, fallback to legacy
   */
  public async getRequestModelEvidence(requestId: string): Promise<any> {
    try {
      return await this.request<any>(`/api/v1/deletions/${encodeURIComponent(requestId)}/model-evidence`);
    } catch {
      return await this.request<any>(`/api/requests/${encodeURIComponent(requestId)}/model-evidence`);
    }
  }

  /**
   * Verification: prefer V1 camelCase, fallback to legacy
   */
  public async getRequestVerification(requestId: string): Promise<DetailedDeletionEvidence> {
    try {
      return await this.request<DetailedDeletionEvidence>(`/api/v1/deletions/${encodeURIComponent(requestId)}/verification`);
    } catch {
      return await this.request<DetailedDeletionEvidence>(`/api/requests/${encodeURIComponent(requestId)}/verification`);
    }
  }

  /**
   * Get Request Evidence: prefer V1 camelCase, fallback to legacy
   */
  public async getRequestEvidence(requestId: string): Promise<DetailedDeletionEvidence> {
    try {
      return await this.request<DetailedDeletionEvidence>(`/api/v1/deletions/${encodeURIComponent(requestId)}/evidence`);
    } catch {
      return await this.request<DetailedDeletionEvidence>(`/api/requests/${encodeURIComponent(requestId)}/evidence`);
    }
  }

  /**
   * Receipt: prefer V1 camelCase, fallback to legacy
   */
  public async getRequestReceipt(requestId: string): Promise<ImmutableReceipt> {
    try {
      return await this.request<ImmutableReceipt>(`/api/v1/deletions/${encodeURIComponent(requestId)}/receipt`);
    } catch {
      return await this.request<ImmutableReceipt>(`/api/requests/${encodeURIComponent(requestId)}/receipt`);
    }
  }

  /**
   * Storage Evidence: prefer V1 camelCase, fallback to legacy
   */
  public async getRequestStorageEvidence(requestId: string): Promise<any> {
    try {
      return await this.request<any>(`/api/v1/deletions/${encodeURIComponent(requestId)}/storage-evidence`);
    } catch {
      return await this.request<any>(`/api/requests/${encodeURIComponent(requestId)}/storage-evidence`);
    }
  }
}

export const apiClient = new ApiClient();
