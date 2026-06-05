from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    description: str
    difficulty: str
    points: int
    hints: list[str]
    sort_order: int


class ChallengeDetail(ChallengeResponse):
    walkthrough: str | None


class LabSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    description: str
    category: str
    difficulty: str
    version: str
    author: str | None
    tags: list[str]
    objectives: list[str]
    is_published: bool
    sort_order: int
    challenge_count: int = 0
    created_at: datetime
    updated_at: datetime


class LabResponse(LabSummary):
    attack_surface: list[str]
    mitigations: list[str]
    detection_opportunities: list[str]
    architecture: dict | None
    threat_model: dict | None
    challenges: list[ChallengeResponse]


class FlagSubmitRequest(BaseModel):
    flag: str
    session_token: str


class FlagSubmitResponse(BaseModel):
    correct: bool
    points_awarded: int
    message: str


class LabInstanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lab_id: uuid.UUID
    session_token: str
    status: str
    port_mappings: dict
    flags_captured: list[str]
    started_at: str | None
