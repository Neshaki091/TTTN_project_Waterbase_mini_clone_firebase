"""
Waterbase RAG AI — FastAPI Server (Microservice)
API endpoints cho RAG retrieval và AI assistance.

Endpoints:
  GET  /health              — Health check
  POST /api/retrieve        — Tìm kiếm semantic
  POST /api/ask             — Hỏi AI Assistant (RAG + Ollama)
  GET|POST /api/embed       — Khởi tạo embedding pipeline (background)
  GET  /api/reload/status   — Xem tiến trình embedding
"""

import os
import sys
import time
import threading
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load env
load_dotenv()

# Import các module RAG
from retrived import retrieve, format_context, embed_query
from assistance import ask, check_ollama_status, check_model_available, OLLAMA_MODEL


# ============================================================================
# LIFESPAN — Kiểm tra kết nối khi khởi động
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi tạo và kiểm tra kết nối khi server start."""
    print("=" * 50)
    print("🚀 Waterbase RAG AI Service — Starting...")

    # Check env vars
    required = ["GOOGLE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"⚠️  Thiếu env: {', '.join(missing)}")
    else:
        print("   ✅ Env variables OK")

    # Check Ollama
    if check_ollama_status():
        print(f"   ✅ Ollama đang chạy")
        if check_model_available(OLLAMA_MODEL):
            print(f"   ✅ Model '{OLLAMA_MODEL}' sẵn sàng")
        else:
            print(f"   ⚠️  Model '{OLLAMA_MODEL}' chưa pull — chạy: ollama pull {OLLAMA_MODEL}")
    else:
        print(f"   ⚠️  Ollama không chạy — endpoint /api/ask sẽ không hoạt động")

    print("   🌐 Server ready!")
    print("=" * 50)

    yield  # Server chạy

    print("👋 Shutting down RAG AI Service...")


# ============================================================================
# APP SETUP
# ============================================================================

app = FastAPI(
    title="Waterbase RAG AI Service",
    description="RAG-based AI Assistant cho Waterbase SDK documentation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: Xử lý bởi Nginx — KHÔNG cấu hình CORS trong service


# ============================================================================
# REQUEST / RESPONSE MODELS
# ============================================================================

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Câu hỏi hoặc từ khóa tìm kiếm")
    top_k: int = Field(default=5, ge=1, le=20, description="Số kết quả trả về")


class RetrieveResponse(BaseModel):
    query: str
    results: list[dict]
    count: int
    elapsed_ms: float


class AskRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Câu hỏi cho AI")
    top_k: int = Field(default=5, ge=1, le=20, description="Số chunks context")


class AskResponse(BaseModel):
    query: str
    answer: str
    sources: list[dict]
    model: str
    elapsed_ms: float


class HealthResponse(BaseModel):
    status: str
    service: str
    ollama_status: str
    ollama_model: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check — kiểm tra trạng thái service và Ollama."""
    ollama_ok = check_ollama_status()
    model_ok = check_model_available(OLLAMA_MODEL) if ollama_ok else False

    return HealthResponse(
        status="healthy",
        service="rag-ai-service",
        ollama_status="connected" if ollama_ok else "disconnected",
        ollama_model=f"{OLLAMA_MODEL} ({'ready' if model_ok else 'not pulled'})",
    )


@app.post("/api/retrieve", response_model=RetrieveResponse)
async def retrieve_endpoint(req: QueryRequest):
    """
    Tìm kiếm semantic — embed câu hỏi và tìm chunks liên quan từ Supabase.
    Không cần Ollama, chỉ cần Gemini API + Supabase.
    """
    try:
        start = time.time()
        results = retrieve(req.query, top_k=req.top_k)
        elapsed = (time.time() - start) * 1000

        return RetrieveResponse(
            query=req.query,
            results=results,
            count=len(results),
            elapsed_ms=round(elapsed, 1),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieve error: {str(e)}")


@app.post("/api/ask", response_model=AskResponse)
async def ask_endpoint(req: AskRequest):
    """
    Hỏi AI Assistant — retrieve context + generate answer bằng Ollama.
    Cần Ollama đang chạy với model đã pull.
    """
    if not check_ollama_status():
        raise HTTPException(
            status_code=503,
            detail=f"Ollama không chạy tại {os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}. "
                   f"Chạy 'ollama serve' trước."
        )

    try:
        start = time.time()

        # Retrieve context
        chunks = retrieve(req.query, top_k=req.top_k)

        # Generate answer (non-streaming cho API)
        from assistance import generate_answer, build_prompt, STREAM_OUTPUT
        context = format_context(chunks)
        prompt = build_prompt(req.query, context)
        answer = generate_answer(prompt, stream=False)

        elapsed = (time.time() - start) * 1000

        # Trích nguồn từ chunks
        sources = [
            {"source": c.get("source", ""), "heading": c.get("heading", ""),
             "similarity": c.get("similarity", 0)}
            for c in chunks
        ]

        return AskResponse(
            query=req.query,
            answer=answer,
            sources=sources,
            model=OLLAMA_MODEL,
            elapsed_ms=round(elapsed, 1),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ask error: {str(e)}")


# ============================================================================
# EMBED / RELOAD — Re-embed knowledge vault (background)
# ============================================================================

# Trạng thái reload (đơn giản, dùng dict thay vì DB)
_reload_state = {"running": False, "last_result": None, "progress": ""}


def _run_embedding_pipeline():
    """Chạy embedding pipeline trong background thread."""
    try:
        start = time.time()
        from embedder import load_vault_files, hybrid_chunk, embed_in_batches, upsert_to_supabase

        _reload_state["progress"] = "[1/4] Đang load files..."
        files = load_vault_files()
        if not files:
            _reload_state["running"] = False
            _reload_state["progress"] = ""
            _reload_state["last_result"] = "❌ Không tìm thấy file .md nào."
            return

        _reload_state["progress"] = f"[2/4] Chunking {len(files)} files..."
        all_chunks = []
        for filename, content in files:
            chunks = hybrid_chunk(content, filename)
            all_chunks.extend(chunks)

        _reload_state["progress"] = f"[3/4] Embedding {len(all_chunks)} chunks..."
        embedded_chunks = embed_in_batches(all_chunks)

        if not embedded_chunks:
            _reload_state["running"] = False
            _reload_state["progress"] = ""
            _reload_state["last_result"] = "❌ Không embed được chunk nào."
            return

        _reload_state["progress"] = f"[4/4] Uploading {len(embedded_chunks)} chunks lên Supabase..."
        upsert_to_supabase(embedded_chunks)

        elapsed = (time.time() - start)
        msg = (f"✅ Hoàn tất! {len(files)} files → "
               f"{len(all_chunks)} chunks → {len(embedded_chunks)} embedded. "
               f"({elapsed:.0f}s)")

        _reload_state["running"] = False
        _reload_state["progress"] = ""
        _reload_state["last_result"] = msg
        print(f"\n🎉 {msg}")

    except Exception as e:
        _reload_state["running"] = False
        _reload_state["progress"] = ""
        _reload_state["last_result"] = f"❌ Lỗi: {str(e)}"
        print(f"\n❌ Embedding lỗi: {e}")


@app.api_route("/api/embed", methods=["GET", "POST"])
@app.post("/api/reload")
async def start_embedding():
    """
    Khởi tạo embedding pipeline (chạy background).
    Trả response ngay lập tức, theo dõi tiến trình tại GET /api/reload/status.
    """
    if _reload_state["running"]:
        return {
            "status": "running",
            "message": "Đang chạy embedding... Dùng GET /api/reload/status để xem tiến trình.",
            "progress": _reload_state["progress"],
        }

    _reload_state["running"] = True
    _reload_state["progress"] = "Đang khởi tạo..."
    _reload_state["last_result"] = None

    thread = threading.Thread(target=_run_embedding_pipeline, daemon=True)
    thread.start()

    return {
        "status": "started",
        "message": "Đã bắt đầu embedding pipeline! Theo dõi tại GET /api/reload/status",
    }


@app.get("/api/reload/status")
async def reload_status():
    """Kiểm tra trạng thái embedding hiện tại."""
    return {
        "running": _reload_state["running"],
        "progress": _reload_state["progress"],
        "last_result": _reload_state["last_result"],
    }


# ============================================================================
# MAIN — Chạy server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3007"))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"🚀 Starting RAG AI Service on {host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=True)

