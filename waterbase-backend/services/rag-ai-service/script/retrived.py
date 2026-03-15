"""
Waterbase RAG — Retriever Module
Tìm kiếm ngữ nghĩa (semantic search) từ Supabase pgvector.

Pipeline: Câu hỏi → Embed (Gemini) → Cosine search (Supabase RPC) → Top-K chunks

Cách dùng:
  - Import:   from retrived import retrieve, format_context
  - CLI:      python retrived.py "câu hỏi của bạn"
"""

import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# ============================================================================
# CẤU HÌNH
# ============================================================================

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Tham số retrieval
EMBEDDING_MODEL = "gemini-embedding-001"    # Phải khớp model đã dùng trong embedder.py
TOP_K = 5                                    # Số kết quả trả về mặc định
SIMILARITY_THRESHOLD = 0.45                  # Ngưỡng similarity tối thiểu (0-1)


# ============================================================================
# EMBEDDING — Embed câu hỏi thành vector
# ============================================================================

def embed_query(query: str) -> list[float]:
    """
    Embed câu hỏi thành vector 768-dim bằng Gemini API.
    Dùng cùng model với embedder.py để đảm bảo cùng vector space.
    """
    from google import genai

    client = genai.Client(api_key=GOOGLE_API_KEY)

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=[query],
    )

    return result.embeddings[0].values


# ============================================================================
# SEARCH — Tìm kiếm semantic trong Supabase
# ============================================================================

def search_similar(
    query_embedding: list[float],
    top_k: int = TOP_K,
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict]:
    """
    Gọi Supabase RPC function 'match_documents' để tìm chunks tương tự.
    Trả về danh sách chunks đã sort theo similarity giảm dần.
    """
    from supabase import create_client

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    response = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": threshold,
        "match_count": top_k,
    }).execute()

    return response.data if response.data else []


# ============================================================================
# RETRIEVE — Pipeline chính: Embed → Search → Return
# ============================================================================

def retrieve(query: str, top_k: int = TOP_K) -> list[dict]:
    """
    Pipeline retreive chính:
      1. Embed câu hỏi thành vector
      2. Tìm kiếm semantic trong Supabase
      3. Trả về top-K chunks kèm similarity score

    Args:
        query: Câu hỏi (tiếng Việt hoặc tiếng Anh)
        top_k: Số kết quả tối đa

    Returns:
        List[dict] — mỗi dict gồm: content, heading, source, similarity, ...
    """
    print(f"🔍 Đang tìm kiếm: \"{query}\"")

    # Bước 1: Embed câu hỏi
    print(f"   🧠 Embedding câu hỏi với {EMBEDDING_MODEL}...")
    start = time.time()
    query_embedding = embed_query(query)
    embed_time = time.time() - start
    print(f"   ✅ Embedded ({embed_time:.2f}s) — vector {len(query_embedding)}-dim")

    # Bước 2: Tìm kiếm
    print(f"   🗄️  Tìm trong Supabase (top_k={top_k}, threshold={SIMILARITY_THRESHOLD})...")
    start = time.time()
    results = search_similar(query_embedding, top_k=top_k)
    search_time = time.time() - start
    print(f"   ✅ Tìm thấy {len(results)} kết quả ({search_time:.2f}s)")

    return results


# ============================================================================
# FORMAT — Chuẩn bị context cho LLM
# ============================================================================

def format_context(chunks: list[dict], max_chars: int = 6000) -> str:
    """
    Format danh sách chunks thành context string cho LLM.
    Gộp các chunks lại và giới hạn tổng ký tự.

    Args:
        chunks: Danh sách chunks từ retrieve()
        max_chars: Giới hạn tổng ký tự context

    Returns:
        String context đã format, sẵn sàng đưa vào prompt
    """
    if not chunks:
        return "Không tìm thấy tài liệu liên quan."

    context_parts = []
    total_chars = 0

    for i, chunk in enumerate(chunks):
        source = chunk.get("source", "unknown")
        heading = chunk.get("heading", "")
        similarity = chunk.get("similarity", 0)
        content = chunk.get("content", "")

        # Header cho mỗi chunk
        header = f"--- [Tài liệu {i+1}] {source}"
        if heading:
            header += f" > {heading}"
        header += f" (độ liên quan: {similarity:.0%}) ---"

        section = f"{header}\n{content}\n"

        # Kiểm tra giới hạn ký tự
        if total_chars + len(section) > max_chars:
            remaining = max_chars - total_chars
            if remaining > 200:  # Chỉ thêm nếu còn đủ chỗ
                section = section[:remaining] + "\n... (đã cắt bớt)"
                context_parts.append(section)
            break

        context_parts.append(section)
        total_chars += len(section)

    return "\n".join(context_parts)


# ============================================================================
# CLI — Chạy standalone để test
# ============================================================================

def print_results(results: list[dict]):
    """In kết quả tìm kiếm đẹp ra terminal."""
    if not results:
        print("\n❌ Không tìm thấy kết quả nào!")
        return

    print(f"\n{'='*60}")
    print(f"📊 KẾT QUẢ TÌM KIẾM — {len(results)} chunks")
    print(f"{'='*60}")

    for i, chunk in enumerate(results):
        similarity = chunk.get("similarity", 0)
        source = chunk.get("source", "?")
        heading = chunk.get("heading", "")
        content = chunk.get("content", "")

        # Truncate content để hiển thị
        preview = content[:200].replace("\n", " ")
        if len(content) > 200:
            preview += "..."

        print(f"\n{'─'*50}")
        print(f"  #{i+1}  📄 {source}")
        if heading:
            print(f"       📌 Section: {heading}")
        print(f"       🎯 Similarity: {similarity:.4f} ({similarity:.0%})")
        print(f"       📝 {preview}")

    print(f"\n{'='*60}")


def main():
    """CLI entrypoint: python retrived.py 'câu hỏi' [top_k]"""

    # Kiểm tra env
    missing = []
    if not GOOGLE_API_KEY:
        missing.append("GOOGLE_API_KEY")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing:
        print(f"❌ Thiếu biến môi trường: {', '.join(missing)}")
        print("   Kiểm tra file .env")
        return

    # Lấy câu hỏi từ argument
    if len(sys.argv) < 2:
        print("📖 Cách dùng: python retrived.py \"câu hỏi\" [top_k]")
        print("   Ví dụ:     python retrived.py \"Cách khởi tạo Waterbase SDK\" 5")
        print()

        # Interactive mode
        print("💬 Hoặc nhập câu hỏi trực tiếp:")
        while True:
            try:
                query = input("\n❓ Câu hỏi: ").strip()
                if not query or query.lower() in ("exit", "quit", "q"):
                    print("👋 Tạm biệt!")
                    break
                results = retrieve(query)
                print_results(results)
            except KeyboardInterrupt:
                print("\n👋 Tạm biệt!")
                break
        return

    query = sys.argv[1]
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else TOP_K

    results = retrieve(query, top_k=top_k)
    print_results(results)

    # In formatted context (để xem LLM sẽ nhận gì)
    if results:
        print(f"\n{'='*60}")
        print("📋 FORMATTED CONTEXT (cho LLM)")
        print(f"{'='*60}")
        print(format_context(results))


if __name__ == "__main__":
    main()
