from fastapi import APIRouter
from api.api_v1.endpoints import auth, code, interviews, practice, ai_interviews

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(code.router, prefix="/code", tags=["code"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(practice.router, prefix="/practice", tags=["practice"])
api_router.include_router(ai_interviews.router, prefix="/ai_interviews", tags=["ai_interviews"])
