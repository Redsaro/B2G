from pydantic import BaseModel
from typing import List, Optional


class ChecklistModel(BaseModel):
    door: bool
    water: bool
    clean: bool
    toilet: bool


class VisionRequest(BaseModel):
    base64_image: str
    checklist: ChecklistModel


class SubmissionModel(BaseModel):
    id: str
    facilityId: str
    submitterType: str
    score: int
    checklist: ChecklistModel
    features: List[str]
    discrepancies: List[str]


class CollusionRequest(BaseModel):
    submissions: List[SubmissionModel]


class HealthNarrativeRequest(BaseModel):
    village_name: str
    population: int
    avg_score: float
    cases_prevented: int


class InvestorSignalRequest(BaseModel):
    village_name: str
    history: List[float]
    avg: float
    std_dev: float
