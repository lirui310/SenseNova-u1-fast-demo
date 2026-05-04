import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field, field_validator


load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT_DIR / "static"

MODEL_NAME = os.getenv("SENSENOVA_MODEL", "sensenova-u1-fast")
BASE_URL = os.getenv("SENSENOVA_BASE_URL", "https://token.sensenova.cn/v1")
REQUEST_TIMEOUT = float(os.getenv("SENSENOVA_REQUEST_TIMEOUT", "120"))
PROMPT_MAX_TOKENS = 4096
PROMPT_MAX_CHARS = 20000
DOCS_URL = "https://platform.sensenova.cn/docs"

SIZE_OPTIONS = [
    {"value": "1664x2496", "label": "1664x2496 ｜ 2:3"},
    {"value": "2496x1664", "label": "2496x1664 ｜ 3:2"},
    {"value": "1760x2368", "label": "1760x2368 ｜ 3:4"},
    {"value": "2368x1760", "label": "2368x1760 ｜ 4:3"},
    {"value": "1824x2272", "label": "1824x2272 ｜ 4:5"},
    {"value": "2272x1824", "label": "2272x1824 ｜ 5:4"},
    {"value": "2048x2048", "label": "2048x2048 ｜ 1:1"},
    {"value": "2752x1536", "label": "2752x1536 ｜ 16:9"},
    {"value": "1536x2752", "label": "1536x2752 ｜ 9:16"},
    {"value": "3072x1376", "label": "3072x1376 ｜ 21:9"},
    {"value": "1344x3136", "label": "1344x3136 ｜ 9:21"},
]
ALLOWED_SIZES = {item["value"] for item in SIZE_OPTIONS}


def estimate_prompt_tokens(text: str) -> int:
    ascii_chars = 0
    tokens = 0

    for char in text:
        if char.isspace():
            if ascii_chars:
                tokens += max(1, (ascii_chars + 3) // 4)
                ascii_chars = 0
            continue

        if char.isascii():
            ascii_chars += 1
        else:
            if ascii_chars:
                tokens += max(1, (ascii_chars + 3) // 4)
                ascii_chars = 0
            tokens += 1

    if ascii_chars:
        tokens += max(1, (ascii_chars + 3) // 4)

    return tokens


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=PROMPT_MAX_CHARS)
    size: str = Field(default="2752x1536")
    n: int = Field(default=1)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        prompt = value.strip()
        if not prompt:
            raise ValueError("prompt cannot be empty")
        if estimate_prompt_tokens(prompt) > PROMPT_MAX_TOKENS:
            raise ValueError(f"prompt estimated token count must be <= {PROMPT_MAX_TOKENS}")
        return prompt

    @field_validator("n")
    @classmethod
    def validate_n(cls, value: int) -> int:
        if value != 1:
            raise ValueError("SenseNova U1 Fast demo locks n to 1")
        return value

    @field_validator("size")
    @classmethod
    def validate_size(cls, value: str) -> str:
        if value not in ALLOWED_SIZES:
            allowed = ", ".join(sorted(ALLOWED_SIZES))
            raise ValueError(f"size must be one of: {allowed}")
        return value


class ImageGenerationResponse(BaseModel):
    created: int | None = None
    model: str
    size: str
    urls: list[str]
    raw: dict[str, Any]


app = FastAPI(title="SenseNova U1 Fast Demo")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def get_client() -> OpenAI:
    load_dotenv()
    api_key = os.getenv("SENSENOVA_API_KEY") or os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("SENSENOVA_BASE_URL", BASE_URL)
    request_timeout = float(os.getenv("SENSENOVA_REQUEST_TIMEOUT", str(REQUEST_TIMEOUT)))

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing SENSENOVA_API_KEY. Please set it in your .env file.",
        )
    return OpenAI(base_url=base_url, api_key=api_key, timeout=request_timeout)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config")
def config() -> dict[str, Any]:
    load_dotenv()
    return {
        "model": os.getenv("SENSENOVA_MODEL", MODEL_NAME),
        "base_url": os.getenv("SENSENOVA_BASE_URL", BASE_URL),
        "endpoint": "POST /v1/images/generations",
        "docs_url": DOCS_URL,
        "prompt_max_tokens": PROMPT_MAX_TOKENS,
        "prompt_max_chars": PROMPT_MAX_CHARS,
        "supports_image_input": False,
        "sizes": SIZE_OPTIONS,
    }


@app.post("/api/generate-image", response_model=ImageGenerationResponse)
def generate_image(payload: ImageGenerationRequest) -> ImageGenerationResponse:
    client = get_client()
    model_name = os.getenv("SENSENOVA_MODEL", MODEL_NAME)

    try:
        response = client.images.generate(
            model=model_name,
            prompt=payload.prompt,
            size=payload.size,
            n=payload.n,
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    raw = response.model_dump(mode="json", exclude_none=True)
    urls = [
        item.get("url")
        for item in raw.get("data", [])
        if isinstance(item, dict) and item.get("url")
    ]

    if not urls:
        raise HTTPException(status_code=502, detail="The image API returned no image URL.")

    return ImageGenerationResponse(
        created=raw.get("created"),
        model=model_name,
        size=payload.size,
        urls=urls,
        raw=raw,
    )
