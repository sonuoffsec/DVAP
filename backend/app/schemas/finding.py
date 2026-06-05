from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class FindingCreate(BaseModel):
    title: str
    description: str
    severity: str
    lab_id: uuid.UUID | None = None
    session_token: str | None = None
    attack_vector: str | None = None
    evidence: dict = {}
    owasp_categories: list[str] = []
    mitre_atlas: list[str] = []
    cwe: list[str] = []
    remediation: str | None = None
    notes: str | None = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        valid = {"critical", "high", "medium", "low", "informational"}
        if v.lower() not in valid:
            raise ValueError(f"severity must be one of {valid}")
        return v.lower()


class FindingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    remediation: str | None = None
    notes: str | None = None


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    severity: str
    status: str
    lab_id: uuid.UUID | None
    session_token: str | None
    attack_vector: str | None
    evidence: dict
    owasp_categories: list[str]
    mitre_atlas: list[str]
    cwe: list[str]
    remediation: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
