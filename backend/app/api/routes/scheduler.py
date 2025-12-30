"""
Scheduler management API routes.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from app.core.scheduler import scheduler

router = APIRouter()


class JobStatusResponse(BaseModel):
    """Response model for job status."""
    jobs: Dict[str, Any]
    is_running: bool


class JobActionResponse(BaseModel):
    """Response model for job actions."""
    success: bool
    message: str


@router.get("/status", response_model=JobStatusResponse)
async def get_scheduler_status():
    """
    Get the status of all scheduled jobs.
    """
    return JobStatusResponse(
        jobs=scheduler.get_job_status(),
        is_running=scheduler.scheduler.running
    )


@router.post("/pause/{job_id}", response_model=JobActionResponse)
async def pause_job(job_id: str):
    """
    Pause a specific scheduled job.
    """
    try:
        scheduler.pause_job(job_id)
        return JobActionResponse(
            success=True,
            message=f"Job '{job_id}' paused successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resume/{job_id}", response_model=JobActionResponse)
async def resume_job(job_id: str):
    """
    Resume a specific scheduled job.
    """
    try:
        scheduler.resume_job(job_id)
        return JobActionResponse(
            success=True,
            message=f"Job '{job_id}' resumed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/start", response_model=JobActionResponse)
async def start_scheduler():
    """
    Start the scheduler if not running.
    """
    try:
        scheduler.start()
        return JobActionResponse(
            success=True,
            message="Scheduler started successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stop", response_model=JobActionResponse)
async def stop_scheduler():
    """
    Stop the scheduler.
    """
    try:
        scheduler.stop()
        return JobActionResponse(
            success=True,
            message="Scheduler stopped successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run/{job_id}", response_model=JobActionResponse)
async def run_job_now(job_id: str):
    """
    Trigger a job to run immediately.
    """
    job = scheduler.scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    try:
        # Modify the job to run now
        scheduler.scheduler.modify_job(job_id, next_run_time=None)
        job.modify(next_run_time=None)

        return JobActionResponse(
            success=True,
            message=f"Job '{job_id}' triggered to run immediately"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
