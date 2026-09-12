from fastapi import APIRouter, Depends, HTTPException, status
from api.deps import get_current_user
from schemas.code import CodeExecutionRequest, CodeExecutionResponse
from services.code_executor import sandbox, LOCAL_CONFIG
from typing import Any

router = APIRouter()

@router.post("/execute", response_model=CodeExecutionResponse)
@router.post("/execute/", response_model=CodeExecutionResponse)
async def execute_code(
    request: CodeExecutionRequest,
    current_user=Depends(get_current_user)
) -> Any:
    if not request.language or not request.source_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="language and source_code are required"
        )
    result = await sandbox.execute(request.language, request.source_code, request.stdin)
    return result

@router.get("/languages")
@router.get("/languages/")
async def get_languages(current_user=Depends(get_current_user)) -> Any:
    return {"languages": list(LOCAL_CONFIG.keys())}
