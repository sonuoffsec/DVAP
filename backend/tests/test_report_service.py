from __future__ import annotations

import uuid

import pytest

from app.models.finding import Finding
from app.models.report import ReportType
from app.services import report_service


def _make_finding(severity: str, owasp: list[str] | None = None, mitre: list[str] | None = None) -> Finding:
    return Finding(
        title=f"Test finding ({severity})",
        description=f"A {severity}-severity vulnerability.",
        severity=severity,
        status="open",
        owasp_categories=owasp or [],
        mitre_atlas=mitre or [],
    )


def test_severity_priority_ordering():
    assert report_service._severity_priority("critical") > report_service._severity_priority("high")
    assert report_service._severity_priority("high") > report_service._severity_priority("medium")
    assert report_service._severity_priority("medium") > report_service._severity_priority("low")
    assert report_service._severity_priority("low") > report_service._severity_priority("informational")


def test_overall_risk_empty():
    assert report_service._overall_risk([]) == "informational"


def test_overall_risk_picks_highest():
    findings = [_make_finding("low"), _make_finding("critical"), _make_finding("medium")]
    assert report_service._overall_risk(findings) == "critical"


def test_build_owasp_mapping_by_finding():
    findings = [_make_finding("high", owasp=["LLM01"])]
    mapping = report_service._build_owasp_mapping(findings)
    matched = [m for m in mapping if m["id"] == "LLM01"]
    assert len(matched) == 1
    assert matched[0]["finding_count"] == 1


def test_build_owasp_mapping_by_lab_category():
    findings = []
    mapping = report_service._build_owasp_mapping(findings, lab_category="prompt_injection")
    matched = [m for m in mapping if m["id"] == "LLM01"]
    assert len(matched) == 1
    assert matched[0]["finding_count"] == 0


def test_build_owasp_mapping_no_duplicates():
    findings = [
        _make_finding("high", owasp=["LLM01"]),
        _make_finding("medium", owasp=["LLM01"]),
    ]
    mapping = report_service._build_owasp_mapping(findings, lab_category="prompt_injection")
    llm01_entries = [m for m in mapping if m["id"] == "LLM01"]
    assert len(llm01_entries) == 1
    assert llm01_entries[0]["finding_count"] == 2


def test_build_mitre_mapping_by_finding():
    findings = [_make_finding("high", mitre=["AML.T0051"])]
    mapping = report_service._build_mitre_mapping(findings)
    matched = [m for m in mapping if m["id"] == "AML.T0051"]
    assert len(matched) == 1


def test_generate_executive_md_structure():
    findings = [_make_finding("critical"), _make_finding("medium")]
    owasp = report_service._build_owasp_mapping(findings, "prompt_injection")
    mitre = report_service._build_mitre_mapping(findings, "prompt_injection")
    md = report_service._generate_executive_md("Test Report", findings, owasp, mitre, "test-lab", "critical")

    assert "# Test Report" in md
    assert "CRITICAL" in md
    assert "Executive Summary" in md
    assert "2 findings" in md


def test_generate_technical_md_includes_findings():
    findings = [
        _make_finding("critical", owasp=["LLM01"], mitre=["AML.T0051"]),
        _make_finding("low"),
    ]
    owasp = report_service._build_owasp_mapping(findings)
    mitre = report_service._build_mitre_mapping(findings)
    md = report_service._generate_technical_md("Technical Report", findings, owasp, mitre, None, "critical")

    assert "Test finding (critical)" in md
    assert "CRITICAL" in md
    assert "LLM01" in md
    assert "AML.T0051" in md


def test_generate_technical_md_sorts_by_severity():
    findings = [_make_finding("low"), _make_finding("critical"), _make_finding("medium")]
    owasp = report_service._build_owasp_mapping(findings)
    mitre = report_service._build_mitre_mapping(findings)
    md = report_service._generate_technical_md("T", findings, owasp, mitre, None, "critical")

    pos_critical = md.index("critical)")
    pos_low = md.index("low)")
    assert pos_critical < pos_low


@pytest.mark.asyncio
async def test_generate_report_executive(db):
    finding = _make_finding("high", owasp=["LLM01"])
    db.add(finding)
    await db.commit()

    report = await report_service.generate_report(db, "My Exec Report", ReportType.EXECUTIVE)
    assert report.id is not None
    assert report.report_type == ReportType.EXECUTIVE
    assert report.findings_count == 1
    assert "high" in report.risk_rating or report.risk_rating == "high"
    assert "My Exec Report" in report.content_md


@pytest.mark.asyncio
async def test_generate_report_technical(db):
    finding = _make_finding("critical", owasp=["LLM07"], mitre=["AML.T0054"])
    db.add(finding)
    await db.commit()

    report = await report_service.generate_report(db, "Technical Deep-Dive", ReportType.TECHNICAL)
    assert report.risk_rating == "critical"
    assert report.content_json["findings_count"] == 1
    assert len(report.owasp_mapping) > 0


@pytest.mark.asyncio
async def test_generate_report_no_findings(db):
    report = await report_service.generate_report(db, "Empty Report", ReportType.EXECUTIVE)
    assert report.findings_count == 0
    assert report.risk_rating == "informational"
