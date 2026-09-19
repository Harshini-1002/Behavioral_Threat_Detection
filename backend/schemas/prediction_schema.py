"""
Pydantic schemas for API request and response data contracts.
Includes explainability feature attributions, live on-chain queries, and batch dataset analysis.
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

class AccountFeatureInput(BaseModel):
    account_id: Optional[str] = Field("0x" + "a"*40, description="Ethereum account public address (0x...)")
    Avg_min_between_sent: float = Field(..., ge=0.0, description="Average minutes between sent transactions")
    Avg_min_between_rec: float = Field(..., ge=0.0, description="Average minutes between received transactions")
    Active_Span_Mins: float = Field(..., ge=0.0, description="Time difference between first and last transaction")
    Sent_tnx: float = Field(..., ge=0.0, description="Total number of sent transactions")
    Received_tnx: float = Field(..., ge=0.0, description="Total number of received transactions")
    Created_Contracts: float = Field(0.0, ge=0.0, description="Total smart contracts deployed by this account")
    Uniq_Rec_Addr: float = Field(..., ge=0.0, description="Count of distinct sending counterparty addresses")
    Uniq_Sent_Addr: float = Field(..., ge=0.0, description="Count of distinct receiving counterparty addresses")
    Avg_Val_Rec: float = Field(..., ge=0.0, description="Average Ether value received per transaction")
    Avg_Val_Sent: float = Field(..., ge=0.0, description="Average Ether value sent per transaction")
    Total_ETH_Rec: float = Field(..., ge=0.0, description="Total Ether received across account lifespan")
    Total_ETH_Sent: float = Field(..., ge=0.0, description="Total Ether sent across account lifespan")
    Ether_Balance: float = Field(..., ge=0.0, description="Current remaining Ether balance")
    Total_ERC20_tnx: float = Field(0.0, ge=0.0, description="Total ERC-20 token transfer count")
    ERC20_Total_Rec: float = Field(0.0, ge=0.0, description="Total ERC-20 token units received")
    ERC20_Total_Sent: float = Field(0.0, ge=0.0, description="Total ERC-20 token units sent")

class ModelScores(BaseModel):
    kmeans: float
    dbscan: float
    hdbscan: float
    isolation_forest: float
    one_class_svm: float
    autoencoder: float
    gan: float
    graph: float

class FeatureAttribution(BaseModel):
    feature: str
    name: str
    value: float
    baseline: float
    impact_percent: float
    direction: str
    explanation: str

class PredictionResponse(BaseModel):
    account_id: str
    prediction: str
    ensemble_score: float
    threshold: float
    severity: str
    confidence: float
    model_scores: ModelScores
    feature_attributions: List[FeatureAttribution] = []
    recommended_action: str
    message: str
    timestamp: str

class ResponseActionRequest(BaseModel):
    account_id: str
    threat_score: float
    severity: str

class ResponseActionReply(BaseModel):
    account_id: str
    threat_score: float
    severity: str
    recommended_action: str
    reason: str
    timestamp: str
    status: str
    simulated_contract_call: str

class HistoryItem(BaseModel):
    id: int
    account_id: str
    timestamp: str
    ensemble_score: float
    threshold: float
    prediction: str
    severity: str
    confidence: float
    model_scores: Dict[str, float]
    recommended_action: str
    action_reason: str
    response_status: str

class StatisticsResponse(BaseModel):
    total_analyzed: int
    normal_accounts: int
    threats_detected: int
    low_threats: int
    medium_threats: int
    high_threats: int
    average_anomaly_score: float
    detection_rate: str
    recent_activity: List[Dict[str, Any]]

class LiveAccountQuery(BaseModel):
    address: str = Field(..., description="Ethereum wallet or contract address (0x...)")

# Batch Dataset Analysis Schemas
class BatchDriverItem(BaseModel):
    driver: str
    count: int
    percentage: float

class ScoreDistributionItem(BaseModel):
    range: str
    count: int
    status: str

class ConfusionMatrixData(BaseModel):
    true_negatives: int
    false_positives: int
    false_negatives: int
    true_positives: int

class ValidationMetrics(BaseModel):
    has_ground_truth: bool
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: ConfusionMatrixData

class BatchSummary(BaseModel):
    total_records: int
    threat_count: int
    normal_count: int
    threat_percentage: float
    average_threat_score: float
    calibrated_threshold: float
    severity_breakdown: Dict[str, int]
    score_distribution: List[ScoreDistributionItem]
    top_drivers: List[BatchDriverItem]
    validation_metrics: Optional[ValidationMetrics] = None

class BatchRecord(BaseModel):
    id: int
    account_id: str
    ensemble_score: float
    prediction: str
    severity: str
    recommended_action: str
    top_driver: str
    model_scores: Dict[str, float]
    features: Dict[str, float]

class BatchAnalysisResponse(BaseModel):
    summary: BatchSummary
    records: List[BatchRecord]
