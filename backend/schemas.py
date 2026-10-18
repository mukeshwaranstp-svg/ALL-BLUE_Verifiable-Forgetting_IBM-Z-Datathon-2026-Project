"""
Pydantic schemas for Verifiable Forgetting backend API.
Ensures strong typing, serialization, and input validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Customer Schemas
# -----------------------------------------------------------------------------
class CustomerResponse(BaseModel):
    customer_id: str
    name: str
    age: int
    account_balance: float
    transaction_count: int
    credit_score: int
    churn_risk: int
    status: str
    created_at: str
    updated_at: str


class CustomerListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[CustomerResponse]


# -----------------------------------------------------------------------------
# Deletion Request Schemas
# -----------------------------------------------------------------------------
class DeletionRequestCreate(BaseModel):
    customer_id: str = Field(..., description="Target customer ID (e.g. C0420)")
    model_type: str = Field(default="neural_network", description="'neural_network' or 'decision_tree'")
    random_seed: int = Field(default=42, description="Random seed for reproducibility")
    idempotency_key: Optional[str] = Field(default=None, description="Client-provided idempotency key")


class BulkDeletionRequestCreate(BaseModel):
    customer_ids: List[str] = Field(..., description="List of target customer IDs")
    model_type: str = Field(default="neural_network", description="'neural_network' or 'decision_tree'")
    random_seed: int = Field(default=42, description="Random seed for reproducibility")


class DeletionRequestResponse(BaseModel):
    request_id: str
    customer_id: str
    status: str
    current_stage: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    error_summary: Optional[str] = None
    idempotency_key: Optional[str] = None
    batch_id: Optional[str] = None


class BulkDeletionResponse(BaseModel):
    batch_id: str
    total_requested: int
    accepted_count: int
    rejected_count: int
    accepted_requests: List[DeletionRequestResponse]
    rejected_entries: List[Dict[str, str]]
    timestamp: str


# -----------------------------------------------------------------------------
# Workflow Stage & Progress Schemas
# -----------------------------------------------------------------------------
class WorkflowStageResponse(BaseModel):
    stage_id: str
    request_id: str
    stage_name: str
    stage_order: int
    status: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result_summary: Optional[str] = None
    error_details: Optional[str] = None


class RequestProgressResponse(BaseModel):
    request_id: str
    customer_id: str
    overall_status: str
    current_stage: Optional[str] = None
    completed_stages_count: int
    total_stages_count: int
    progress_percentage: float
    stages: List[WorkflowStageResponse]


# -----------------------------------------------------------------------------
# Storage & Backup Evidence Schemas
# -----------------------------------------------------------------------------
class StorageEvidenceResponse(BaseModel):
    request_id: str
    customer_id: str
    active_storage_deleted: bool
    rows_deleted: int
    tombstone_created: bool
    tombstone_id: Optional[str] = None
    backup_inspection: Dict[str, Any]
    isolated_restore: Dict[str, Any]
    reconciliation: Dict[str, Any]
    checks: List[Dict[str, Any]]


class BackupItemResponse(BaseModel):
    backup_id: str
    filename: str
    path: str
    size_bytes: int
    created_at: str
    is_pre_deletion: bool


# -----------------------------------------------------------------------------
# ML Model & Comparison Schemas
# -----------------------------------------------------------------------------
class ModelMetadataResponse(BaseModel):
    model_type: str
    random_seed: int
    train_row_count: int
    test_row_count: int
    metrics: Dict[str, Any]
    artifact_hash: str
    neural_network: Optional[Dict[str, Any]] = None


class ModelComparisonResponse(BaseModel):
    request_id: str
    customer_id: str
    model_type: str
    baseline_metrics: Dict[str, Any]
    retrained_metrics: Optional[Dict[str, Any]] = None
    metric_deltas: Optional[Dict[str, Any]] = None
    artifact_hashes: Dict[str, str]
    record_counts: Dict[str, int]
    neural_network_internals: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# Verification & Evidence Schemas
# -----------------------------------------------------------------------------
class VerificationCheck(BaseModel):
    check_id: str
    check_name: str
    target: str  # 'storage', 'backup', 'model', 'audit'
    status: str  # 'CONFIRMED', 'FAILED', 'UNVERIFIED', 'RETAINED'
    details: str
    timestamp: str


class VerificationResponse(BaseModel):
    request_id: str
    customer_id: str
    overall_status: str
    checks: List[VerificationCheck]
    summary: str


class EvidenceItemResponse(BaseModel):
    evidence_id: str
    request_id: str
    customer_id: str
    stage_or_check_name: str
    status: str
    timestamp: str
    details: Dict[str, Any]
    artifact_ref: Optional[str] = None


# -----------------------------------------------------------------------------
# Audit Receipt Schemas
# -----------------------------------------------------------------------------
class AuditReceiptResponse(BaseModel):
    receipt_id: str
    request_id: str
    customer_id: str
    generated_at: str
    overall_status: str
    stage_outcomes: List[Dict[str, Any]]
    verification_checks: List[Dict[str, Any]]
    evidence_references: List[str]
    warnings_and_limitations: str


# -----------------------------------------------------------------------------
# Dashboard Summary Schema
# -----------------------------------------------------------------------------
class DashboardSummaryResponse(BaseModel):
    total_customers: int
    active_customers: int
    deleted_customers: int
    total_requests: int
    confirmed_requests: int
    failed_requests: int
    tombstones_count: int
    backups_count: int
    baseline_model_status: str
    latest_requests: List[DeletionRequestResponse]
