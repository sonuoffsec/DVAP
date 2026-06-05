from fastapi import APIRouter

from app.api.v1 import benchmarks, campaigns, findings, health, instances, labs, reports, research, settings, soc

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Platform"])
api_router.include_router(labs.router, prefix="/labs", tags=["Labs"])
api_router.include_router(instances.router, prefix="/labs", tags=["Instances"])
api_router.include_router(findings.router, prefix="/findings", tags=["Findings"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(soc.router, prefix="/soc", tags=["AI-SOC"])
api_router.include_router(research.router, prefix="/research", tags=["Research"])
api_router.include_router(benchmarks.router, prefix="/benchmarks", tags=["Benchmarks"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
