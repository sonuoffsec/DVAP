from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LaunchRequest(BaseModel):
    session_token: str | None = None


class InstanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lab_id: uuid.UUID
    session_token: str
    status: str
    port_mappings: dict
    flags_captured: list[str]
    started_at: str | None
    stopped_at: str | None
    access_url: str | None = None


class InstanceLogsResponse(BaseModel):
    logs: str
    container_id: str
