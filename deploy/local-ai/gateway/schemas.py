"""Strict request and finding contracts. Submitted paths are labels, never opened."""
import json
import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictBool, field_validator, model_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

class FileInput(StrictModel):
    path: str = Field(min_length=1, max_length=512)
    content: str = Field(max_length=16000)

    @field_validator("path")
    @classmethod
    def safe_path(cls, value):
        if value.startswith(("/", "\\")) or "\\" in value or ":" in value or any(ord(c)<32 for c in value):
            raise ValueError("Use relative POSIX file paths.")
        if any(part in ("", ".", "..") for part in value.split("/")):
            raise ValueError("Invalid file path.")
        return value

class DetectRequest(StrictModel):
    files: list[FileInput] = Field(min_length=1, max_length=32)

    @model_validator(mode="after")
    def unique_and_bounded(self):
        if len({f.path for f in self.files}) != len(self.files):
            raise ValueError("Duplicate paths.")
        if sum(len(f.content.encode("utf-8")) for f in self.files)>16000:
            raise ValueError("Source content exceeds limit.")
        return self

class Detection(StrictModel):
    detector: Literal["foundation-sec-8b"]
    ruleId: Literal["ai.security-review"]
    file: str = Field(min_length=1, max_length=512)
    line: StrictInt = Field(ge=1)
    severity: Literal["critical", "high", "medium", "low"]
    message: str = Field(min_length=1, max_length=512)
    gridImpact: StrictBool

class ModelResponse(StrictModel):
    detections: list[Detection] = Field(max_length=32)

def validate_detections(raw, inputs: DetectRequest) -> list[dict]:
    if isinstance(raw, str):
        raw = json.loads(raw)
    if not isinstance(raw, list):
        raise ValueError("Expected Detection array.")
    findings = ModelResponse.model_validate({"detections":raw}).detections
    bounds = {f.path:max(1,len(f.content.splitlines())) for f in inputs.files}
    for f in findings:
        if f.file not in bounds or f.line>bounds[f.file]:
            raise ValueError("Finding does not refer to an input source line.")
    return [f.model_dump() for f in findings]
