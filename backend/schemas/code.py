from pydantic import BaseModel
from typing import Optional

class CodeExecutionRequest(BaseModel):
    language: str
    source_code: str
    stdin: Optional[str] = ''

class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool
