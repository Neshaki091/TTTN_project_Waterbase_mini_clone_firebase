"""
Waterbase RAG AI — Local Server (không cần FastAPI)
Dùng http.server built-in của Python để test local nhanh.

Endpoints (giống server.py):
  GET  /health              — Health check
  POST /api/retrieve        — Tìm kiếm semantic
  POST /api/ask             — Hỏi AI Assistant
  POST /api/embed           — Khởi tạo tài nguyên (chạy embedding pipeline)
  POST /api/reload          — Reload knowledge vault (alias của /api/embed)
  GET  /api/reload/status   — Trạng thái reload

Cách chạy:
  python serverlocal.py
"""

import os
import sys
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from dotenv import load_dotenv

load_dotenv()

# Import các module RAG
from retrived import retrieve, format_context
from assistance import ask, check_ollama_status, check_model_available, OLLAMA_MODEL

PORT = int(os.getenv("PORT", "3007"))

# Trạng thái reload
_reload_state = {"running": False, "last_result": None, "progress": ""}


class RAGHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler cho RAG AI Service."""

    def _send_json(self, data: dict, status: int = 200):
        """Gửi JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _read_body(self) -> dict:
        """Đọc JSON body từ request."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode("utf-8"))

    # ── OPTIONS (CORS preflight) ──
    def do_OPTIONS(self):
        self._send_json({}, 204)

    # ── GET endpoints ──
    def do_GET(self):
        if self.path == "/health":
            self._handle_health()
        elif self.path in ("/api/embed", "/api/reload"):
            self._handle_reload()
        elif self.path == "/api/reload/status":
            self._handle_reload_status()
        else:
            self._send_json({"error": "Not found"}, 404)

    # ── POST endpoints ──
    def do_POST(self):
        if self.path == "/api/retrieve":
            self._handle_retrieve()
        elif self.path == "/api/ask":
            self._handle_ask()
        elif self.path in ("/api/embed", "/api/reload"):
            self._handle_reload()
        else:
            self._send_json({"error": "Not found"}, 404)

    # ── Handlers ──

    def _handle_health(self):
        ollama_ok = check_ollama_status()
        model_ok = check_model_available(OLLAMA_MODEL) if ollama_ok else False
        self._send_json({
            "status": "healthy",
            "service": "rag-ai-service (local)",
            "ollama_status": "connected" if ollama_ok else "disconnected",
            "ollama_model": f"{OLLAMA_MODEL} ({'ready' if model_ok else 'not pulled'})",
        })

    def _handle_retrieve(self):
        try:
            body = self._read_body()
            query = body.get("query", "")
            top_k = body.get("top_k", 5)

            if not query:
                self._send_json({"error": "query is required"}, 400)
                return

            start = time.time()
            results = retrieve(query, top_k=top_k)
            elapsed = (time.time() - start) * 1000

            self._send_json({
                "query": query,
                "results": results,
                "count": len(results),
                "elapsed_ms": round(elapsed, 1),
            })
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_ask(self):
        if not check_ollama_status():
            self._send_json({
                "error": f"Ollama không chạy. Chạy 'ollama serve' trước."
            }, 503)
            return

        try:
            body = self._read_body()
            query = body.get("query", "")
            top_k = body.get("top_k", 5)

            if not query:
                self._send_json({"error": "query is required"}, 400)
                return

            start = time.time()

            # Retrieve context
            chunks = retrieve(query, top_k=top_k)

            # Generate answer
            from assistance import generate_answer, build_prompt
            context = format_context(chunks)
            prompt = build_prompt(query, context)
            answer = generate_answer(prompt, stream=False)

            elapsed = (time.time() - start) * 1000

            sources = [
                {"source": c.get("source", ""), "heading": c.get("heading", ""),
                 "similarity": c.get("similarity", 0)}
                for c in chunks
            ]

            self._send_json({
                "query": query,
                "answer": answer,
                "sources": sources,
                "model": OLLAMA_MODEL,
                "elapsed_ms": round(elapsed, 1),
            })
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_reload(self):
        if _reload_state["running"]:
            self._send_json({
                "status": "running",
                "message": "Đang chạy embedding... Dùng GET /api/reload/status để xem tiến trình.",
                "progress": _reload_state["progress"],
            }, 409)
            return

        _reload_state["running"] = True
        _reload_state["progress"] = "Đang khởi tạo..."
        _reload_state["last_result"] = None

        # Trả response ngay lập tức
        self._send_json({
            "status": "started",
            "message": "Đã bắt đầu embedding pipeline! Theo dõi tại GET /api/reload/status",
        })

        # Chạy embedding trong background thread
        thread = threading.Thread(target=self._run_embedding_pipeline, daemon=True)
        thread.start()

    @staticmethod
    def _run_embedding_pipeline():
        """Chạy embedding pipeline trong background."""
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

    def _handle_reload_status(self):
        self._send_json({
            "running": _reload_state["running"],
            "progress": _reload_state["progress"],
            "last_result": _reload_state["last_result"],
        })

    # Tắt log mặc định cho gọn
    def log_message(self, format, *args):
        print(f"  {args[0]} {args[1]}")


def main():
    # Kiểm tra env
    missing = []
    if not os.getenv("GOOGLE_API_KEY"):
        missing.append("GOOGLE_API_KEY")
    if not os.getenv("SUPABASE_URL"):
        missing.append("SUPABASE_URL")
    if not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        print(f"❌ Thiếu env: {', '.join(missing)}")
        return

    print("=" * 50)
    print(f"🚀 RAG AI Service — Local Server")
    print(f"   URL:   http://localhost:{PORT}")
    print(f"   Model: {OLLAMA_MODEL}")
    print(f"   Ollama: {'✅ connected' if check_ollama_status() else '❌ disconnected'}")
    print("=" * 50)
    print()
    print("📌 Endpoints:")
    print(f"   GET  http://localhost:{PORT}/health")
    print(f"   POST http://localhost:{PORT}/api/retrieve")
    print(f"   POST http://localhost:{PORT}/api/ask")
    print(f"   POST http://localhost:{PORT}/api/embed    ← Khởi tạo embedding")
    print(f"   POST http://localhost:{PORT}/api/reload   ← Alias của /api/embed")
    print()

    server = HTTPServer(("0.0.0.0", PORT), RAGHandler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Tạm biệt!")
        server.server_close()


if __name__ == "__main__":
    main()
