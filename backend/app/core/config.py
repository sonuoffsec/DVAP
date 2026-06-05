from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    environment: Literal["development", "production", "testing"] = "development"
    log_level: str = "INFO"
    secret_key: str

    database_url: str
    redis_url: str
    qdrant_url: AnyHttpUrl = "http://qdrant:6333"  # type: ignore[assignment]
    ollama_url: AnyHttpUrl = "http://ollama:11434"  # type: ignore[assignment]

    cors_origins: list[str] = ["*"]

    dvap_labs_network: str = "dvap_dvap-labs"
    dvap_ollama_container: str = "dvap-ollama"

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("Only PostgreSQL is supported")
        return v

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
