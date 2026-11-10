import asyncio
import json
import logging
import time
import urllib.request
from typing import List, Optional, Dict, Any

from schemas.jobs import JobPosting, JobPulseResponse

logger = logging.getLogger(__name__)

ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"
CACHE_TTL_SECONDS = 900  # 15 Minutes Cache TTL (900 seconds)

# In-memory Cache storage for job postings
_job_cache: Dict[str, Any] = {
    "timestamp": 0.0,
    "jobs": []
}

# Curated Fallback Jobs for Circuit-Breaker Resilience
FALLBACK_JOBS: List[Dict[str, Any]] = [
    {
        "id": "fb-1",
        "title": "Backend Python / FastAPI Engineer",
        "company_name": "Mindtickle",
        "location": "Remote",
        "remote": True,
        "url": "https://www.mindtickle.com/careers",
        "tags": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "track": "backend",
        "created_at": int(time.time()) - 3600
    },
    {
        "id": "fb-2",
        "title": "Frontend React / TypeScript Developer",
        "company_name": "Shopify",
        "location": "Remote / Hybrid",
        "remote": True,
        "url": "https://www.shopify.com/careers",
        "tags": ["React", "TypeScript", "Tailwind", "REST API"],
        "track": "frontend",
        "created_at": int(time.time()) - 7200
    },
    {
        "id": "fb-3",
        "title": "Fullstack Cloud Developer",
        "company_name": "Stripe",
        "location": "Remote",
        "remote": True,
        "url": "https://stripe.com/jobs",
        "tags": ["Node.js", "React", "PostgreSQL", "AWS"],
        "track": "fullstack",
        "created_at": int(time.time()) - 10800
    },
    {
        "id": "fb-4",
        "title": "Junior Data Analyst / BI Specialist",
        "company_name": "Databricks",
        "location": "Remote",
        "remote": True,
        "url": "https://www.databricks.com/company/careers",
        "tags": ["SQL", "Python", "Tableau", "PowerBI"],
        "track": "data_analyst",
        "created_at": int(time.time()) - 14400
    }
]

def _classify_track(title: str, tags: List[str]) -> str:
    """Classifies a job into one of AISaraj's core tracks based on title and tags."""
    content = f"{title.lower()} {' '.join(t.lower() for t in tags)}"
    
    is_data = any(w in content for w in ["data analyst", "analytics", "business intelligence", "tableau", "power bi", "pandas"])
    if is_data:
        return "data_analyst"
        
    is_fullstack = "fullstack" in content or "full-stack" in content or "full stack" in content
    if is_fullstack:
        return "fullstack"
        
    is_front = any(w in content for w in ["frontend", "front-end", "react", "vue", "angular", "css", "html", "javascript", "typescript", "ui/ux"])
    is_back = any(w in content for w in ["backend", "back-end", "python", "django", "fastapi", "node", "express", "golang", "java", "spring", "sql", "postgres"])
    
    if is_front and is_back:
        return "fullstack"
    elif is_front:
        return "frontend"
    elif is_back:
        return "backend"
        
    return "fullstack"

def _sync_fetch_external_jobs() -> List[JobPosting]:
    """
    Synchronously fetches raw jobs from external API with a strict 4.5s timeout.
    Executed in a background worker thread to never block FastAPI's async event loop.
    """
    req = urllib.request.Request(
        ARBEITNOW_API_URL,
        headers={
            "User-Agent": "AISaraj-JobPulse/1.0 (+https://ai-saraj.vercel.app)",
            "Accept": "application/json"
        }
    )
    
    with urllib.request.urlopen(req, timeout=4.5) as resp:
        if resp.status != 200:
            raise RuntimeError(f"External API returned HTTP {resp.status}")
        raw_data = json.loads(resp.read().decode("utf-8"))
        
    raw_jobs = raw_data.get("data", [])
    projected_jobs: List[JobPosting] = []
    
    for item in raw_jobs[:30]:  # Limit to top 30 jobs
        tags = item.get("tags") or []
        title = item.get("title") or "Software Engineer"
        track = _classify_track(title, tags)
        
        # Minify payload: exclude bulky HTML description!
        projected_jobs.append(JobPosting(
            id=str(item.get("slug") or f"job-{len(projected_jobs)}"),
            title=title,
            company_name=item.get("company_name") or "Tech Company",
            location=item.get("location") or "Remote",
            remote=bool(item.get("remote", True)),
            url=item.get("url") or "#",
            tags=tags[:5],  # Keep top 5 tags only
            track=track,
            created_at=item.get("created_at")
        ))
        
    return projected_jobs

async def get_live_tech_jobs(track: Optional[str] = None) -> JobPulseResponse:
    """
    Returns live tech job openings using Cache-Aside and Circuit-Breaker patterns:
    1. Returns from In-Memory Cache in < 1ms if TTL is valid.
    2. On Cache Miss: Fetches from Arbeitnow asynchronously with strict timeout.
    3. Trims payload down by 99% (strips bulky descriptions).
    4. On failure/timeout: Serves graceful fallback data without crashing.
    5. Filters by candidate track if specified.
    """
    now = time.time()
    cached = False
    
    # Check if cached data is fresh
    if _job_cache["jobs"] and (now - _job_cache["timestamp"]) < CACHE_TTL_SECONDS:
        all_jobs = _job_cache["jobs"]
        cached = True
    else:
        # Cache miss or expired: fetch fresh data asynchronously
        try:
            fetched_jobs = await asyncio.to_thread(_sync_fetch_external_jobs)
            if fetched_jobs:
                _job_cache["jobs"] = fetched_jobs
                _job_cache["timestamp"] = now
                all_jobs = fetched_jobs
            else:
                all_jobs = _job_cache["jobs"] or [JobPosting(**j) for j in FALLBACK_JOBS]
        except Exception as e:
            logger.warning(f"[JobService] External job fetch failed, activating circuit-breaker fallback: {e}")
            all_jobs = _job_cache["jobs"] or [JobPosting(**j) for j in FALLBACK_JOBS]
            cached = True

    # Filter by candidate track if provided
    filtered_jobs = all_jobs
    if track and track.lower() != 'all':
        track_lower = track.lower()
        filtered_jobs = [j for j in all_jobs if j.track == track_lower or j.track == 'fullstack']

    return JobPulseResponse(
        total_jobs=len(filtered_jobs),
        updated_at=_job_cache["timestamp"] or now,
        source="Arbeitnow Real-Time Tech Feed",
        cached=cached,
        jobs=filtered_jobs
    )

