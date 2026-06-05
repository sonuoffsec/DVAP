from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse, ORJSONResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.core.database import DbSession
from app.models.report import Report
from app.services import report_service

router = APIRouter()


class ReportCreate(BaseModel):
    name: str
    report_type: str = "technical"
    lab_slug: str | None = None


def _serialize(r: Report) -> dict:
    return {
        "id": str(r.id),
        "name": r.name,
        "report_type": r.report_type,
        "lab_slug": r.lab_slug,
        "risk_rating": r.risk_rating,
        "findings_count": r.findings_count,
        "owasp_count": len(r.owasp_mapping),
        "mitre_count": len(r.mitre_mapping),
        "tags": r.tags,
        "created_at": r.created_at.isoformat(),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def generate_report(db: DbSession, body: ReportCreate) -> dict:
    if body.report_type not in ("executive", "technical", "threat_model", "benchmark"):
        raise HTTPException(status_code=400, detail="Invalid report type")

    report = await report_service.generate_report(
        db,
        name=body.name,
        report_type=body.report_type,
        lab_slug=body.lab_slug,
    )
    return _serialize(report)


@router.get("")
async def list_reports(db: DbSession) -> list[dict]:
    stmt = select(Report).order_by(Report.created_at.desc()).limit(50)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.get("/{report_id}")
async def get_report(db: DbSession, report_id: uuid.UUID) -> dict:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    data = _serialize(report)
    data["content_md"] = report.content_md
    data["content_html"] = report.content_html
    data["content_json"] = report.content_json
    data["owasp_mapping"] = report.owasp_mapping
    data["mitre_mapping"] = report.mitre_mapping
    return data


@router.get("/{report_id}/download/markdown", response_class=PlainTextResponse)
async def download_markdown(db: DbSession, report_id: uuid.UUID) -> str:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return PlainTextResponse(
        content=report.content_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{report.name.replace(" ", "_")}.md"'},
    )


@router.get("/{report_id}/download/html", response_class=HTMLResponse)
async def download_html(db: DbSession, report_id: uuid.UUID) -> HTMLResponse:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    filename = report.name.replace(" ", "_")
    return HTMLResponse(
        content=report.content_html,
        headers={"Content-Disposition": f'attachment; filename="{filename}.html"'},
    )


@router.get("/{report_id}/download/json")
async def download_json(db: DbSession, report_id: uuid.UUID) -> ORJSONResponse:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return ORJSONResponse(
        content={**_serialize(report), "content_md": report.content_md, **report.content_json},
        headers={"Content-Disposition": f'attachment; filename="{report.name.replace(" ", "_")}.json"'},
    )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(db: DbSession, report_id: uuid.UUID) -> None:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
