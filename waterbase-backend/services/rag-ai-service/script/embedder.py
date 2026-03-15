"""
Waterbase RAG - Embedder Script
Đọc các file markdown từ knowlegde-vault, chia nhỏ bằng Hybrid Chunking,
tạo vector embeddings bằng Gemini text-embedding-004, và lưu vào Supabase.

Hybrid Chunking Strategy:
  1. Structural Split — Chia theo heading markdown (# ## ###)
  2. Semantic Split  — Chia tiếp mỗi section dài theo đoạn văn / code block
  3. Fixed-size Split — Nếu chunk vẫn quá dài, cắt theo token limit
"""

import os
import re
import json
import time
import hashlib
from pathlib import Path
from dotenv import load_dotenv

# ============================================================================
# CẤU HÌNH
# ============================================================================

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Tham số chunking
MAX_CHUNK_CHARS = 1500      # Kích thước tối đa 1 chunk (ký tự)
MIN_CHUNK_CHARS = 100       # Kích thước tối thiểu (bỏ chunk quá ngắn)
OVERLAP_CHARS = 150         # Overlap giữa các fixed-size chunks

# Tham số embedding
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 1536  # Cân bằng giữa chính xác (3072) và nhẹ (768)
BATCH_SIZE = 5              # Số chunks embed cùng lúc
API_DELAY = 10              # Delay giữa các batch (giây) — tránh rate limit

# Đường dẫn
VAULT_DIR = Path(__file__).parent.parent / "knowlegde-vault"
TABLE_NAME = "documents"

# ============================================================================
# HYBRID CHUNKING
# ============================================================================

def split_by_headings(text: str) -> list[dict]:
    """
    Bước 1 — Structural Split: Chia markdown theo headings (# ## ### ####).
    Mỗi section gồm heading title + nội dung bên dưới.
    """
    # Pattern: dòng bắt đầu bằng 1-4 dấu # theo sau khoảng trắng
    heading_pattern = re.compile(r"^(#{1,4})\s+(.+)$", re.MULTILINE)

    sections = []
    matches = list(heading_pattern.finditer(text))

    if not matches:
        # Không có heading → coi toàn bộ là 1 section
        return [{"heading": "", "level": 0, "content": text.strip()}]

    # Nội dung trước heading đầu tiên (nếu có)
    preamble = text[: matches[0].start()].strip()
    if preamble:
        sections.append({"heading": "", "level": 0, "content": preamble})

    for i, match in enumerate(matches):
        level = len(match.group(1))
        heading = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        content = text[start:end].strip()

        sections.append({
            "heading": heading,
            "level": level,
            "content": f"{'#' * level} {heading}\n\n{content}" if content else f"{'#' * level} {heading}",
        })

    return sections


def split_by_paragraphs(text: str) -> list[str]:
    """
    Bước 2 — Semantic Split: Chia text thành các đoạn văn và code blocks.
    Giữ nguyên code blocks (```...```) không bị cắt giữa chừng.
    """
    # Tách code blocks ra trước
    code_block_pattern = re.compile(r"(```[\s\S]*?```)", re.MULTILINE)
    parts = code_block_pattern.split(text)

    chunks = []
    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Nếu là code block → giữ nguyên
        if part.startswith("```") and part.endswith("```"):
            chunks.append(part)
        else:
            # Chia theo dòng trống (đoạn văn)
            paragraphs = re.split(r"\n\s*\n", part)
            for para in paragraphs:
                para = para.strip()
                if para:
                    chunks.append(para)

    return chunks


def split_fixed_size(text: str, max_chars: int = MAX_CHUNK_CHARS,
                     overlap: int = OVERLAP_CHARS) -> list[str]:
    """
    Bước 3 — Fixed-size Split: Cắt text dài theo kích thước cố định với overlap.
    Ưu tiên cắt tại ranh giới dòng.
    """
    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + max_chars

        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Tìm vị trí xuống dòng gần nhất để cắt đẹp
        newline_pos = text.rfind("\n", start, end)
        if newline_pos > start + max_chars // 2:
            end = newline_pos

        chunks.append(text[start:end].strip())
        start = end - overlap  # Overlap

    return chunks


def hybrid_chunk(text: str, source_file: str) -> list[dict]:
    """
    Hybrid Chunking Pipeline: Structural → Semantic → Fixed-size.
    Trả về danh sách chunks với metadata.
    """
    all_chunks = []

    # Bước 1: Chia theo headings
    sections = split_by_headings(text)

    for section in sections:
        content = section["content"]

        if len(content) <= MAX_CHUNK_CHARS:
            # Section đủ nhỏ → giữ nguyên
            if len(content) >= MIN_CHUNK_CHARS:
                all_chunks.append({
                    "content": content,
                    "heading": section["heading"],
                    "source": source_file,
                })
        else:
            # Bước 2: Chia theo đoạn văn
            paragraphs = split_by_paragraphs(content)

            # Gộp các đoạn nhỏ lại với nhau
            current_chunk = ""
            for para in paragraphs:
                if len(current_chunk) + len(para) + 2 <= MAX_CHUNK_CHARS:
                    current_chunk += ("\n\n" + para) if current_chunk else para
                else:
                    # Flush current chunk
                    if current_chunk and len(current_chunk) >= MIN_CHUNK_CHARS:
                        all_chunks.append({
                            "content": current_chunk,
                            "heading": section["heading"],
                            "source": source_file,
                        })
                    # Bước 3: Nếu paragraph đơn lẻ vẫn quá dài → fixed-size split
                    if len(para) > MAX_CHUNK_CHARS:
                        fixed_parts = split_fixed_size(para)
                        for fp in fixed_parts:
                            if len(fp) >= MIN_CHUNK_CHARS:
                                all_chunks.append({
                                    "content": fp,
                                    "heading": section["heading"],
                                    "source": source_file,
                                })
                        current_chunk = ""
                    else:
                        current_chunk = para

            # Đoạn cuối
            if current_chunk and len(current_chunk) >= MIN_CHUNK_CHARS:
                all_chunks.append({
                    "content": current_chunk,
                    "heading": section["heading"],
                    "source": source_file,
                })

    # Gắn thêm metadata
    for i, chunk in enumerate(all_chunks):
        chunk["chunk_index"] = i
        chunk["chunk_id"] = hashlib.md5(
            f"{source_file}:{i}:{chunk['content'][:50]}".encode()
        ).hexdigest()

    return all_chunks


# ============================================================================
# EMBEDDING (Gemini)
# ============================================================================

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Gọi Gemini Embedding API để tạo vector embeddings.
    Sử dụng google.genai (package mới, thay thế google.generativeai).
    """
    from google import genai

    client = genai.Client(api_key=GOOGLE_API_KEY)

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config={"output_dimensionality": EMBEDDING_DIMENSION},  # Giới hạn về 1536 chiều
    )

    return [embedding.values for embedding in result.embeddings]


def embed_in_batches(chunks: list[dict]) -> list[dict]:
    """
    Embed chunks theo batch để tránh rate limit.
    Mỗi batch = BATCH_SIZE chunks, delay API_DELAY giây giữa các batch.
    """
    total = len(chunks)
    print(f"\n🔄 Bắt đầu embedding {total} chunks (batch_size={BATCH_SIZE})...")

    for i in range(0, total, BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        texts = [c["content"] for c in batch]

        try:
            embeddings = get_embeddings(texts)

            for chunk, emb in zip(batch, embeddings):
                chunk["embedding"] = emb

            print(f"   ✅ Batch {i // BATCH_SIZE + 1}/{(total - 1) // BATCH_SIZE + 1} "
                  f"— {len(batch)} chunks embedded")

        except Exception as e:
            print(f"   ❌ Batch {i // BATCH_SIZE + 1} thất bại: {e}")
            # Retry 1 lần sau khi chờ lâu hơn
            print(f"   🔁 Retry sau {API_DELAY * 3}s...")
            time.sleep(API_DELAY * 3)
            try:
                embeddings = get_embeddings(texts)
                for chunk, emb in zip(batch, embeddings):
                    chunk["embedding"] = emb
                print(f"   ✅ Retry thành công!")
            except Exception as retry_err:
                print(f"   💀 Retry thất bại: {retry_err}")
                for chunk in batch:
                    chunk["embedding"] = None

        if i + BATCH_SIZE < total:
            time.sleep(API_DELAY)

    embedded = [c for c in chunks if c.get("embedding") is not None]
    failed = total - len(embedded)
    if failed > 0:
        print(f"\n⚠️  {failed}/{total} chunks không embed được.")

    return embedded


# ============================================================================
# SUPABASE STORAGE
# ============================================================================

def upsert_to_supabase(chunks: list[dict]):
    """
    Lưu chunks + embeddings vào Supabase table 'documents'.
    Sử dụng upsert dựa trên chunk_id để tránh duplicate.
    """
    from supabase import create_client

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    total = len(chunks)
    success = 0
    errors = 0

    print(f"\n📤 Uploading {total} chunks lên Supabase...")

    for i, chunk in enumerate(chunks):
        row = {
            "chunk_id": chunk["chunk_id"],
            "content": chunk["content"],
            "heading": chunk.get("heading", ""),
            "source": chunk["source"],
            "chunk_index": chunk["chunk_index"],
            "embedding": chunk["embedding"],
            "metadata": json.dumps({
                "source_file": chunk["source"],
                "heading": chunk.get("heading", ""),
                "chunk_index": chunk["chunk_index"],
                "char_count": len(chunk["content"]),
            }),
        }

        try:
            supabase.table(TABLE_NAME).upsert(
                row, on_conflict="chunk_id"
            ).execute()
            success += 1
        except Exception as e:
            print(f"   ❌ Chunk '{chunk['chunk_id'][:8]}...' lỗi: {e}")
            errors += 1

    print(f"\n📊 Kết quả: {success}/{total} thành công, {errors} lỗi.")


# ============================================================================
# MAIN PIPELINE
# ============================================================================

def load_vault_files() -> list[tuple[str, str]]:
    """
    Đọc tất cả file .md từ knowlegde-vault.
    Trả về danh sách (filename, content).
    """
    files = []
    vault_path = Path(VAULT_DIR)

    if not vault_path.exists():
        print(f"❌ Thư mục knowlegde-vault không tồn tại: {vault_path}")
        return files

    for md_file in sorted(vault_path.glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        if content.strip():
            files.append((md_file.name, content))
            print(f"   📄 Loaded: {md_file.name} ({len(content):,} chars)")

    return files


def main():
    """Pipeline chính: Load → Chunk → Embed → Store."""

    print("=" * 60)
    print("🚀 WATERBASE RAG — Embedder Pipeline")
    print(f"   Model: {EMBEDDING_MODEL}")
    print(f"   Chunking: Hybrid (Structural → Semantic → Fixed-size)")
    print(f"   Max chunk: {MAX_CHUNK_CHARS} chars | Overlap: {OVERLAP_CHARS} chars")
    print("=" * 60)

    # Kiểm tra env
    missing = []
    if not GOOGLE_API_KEY:
        missing.append("GOOGLE_API_KEY")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing:
        print(f"\n❌ Thiếu biến môi trường: {', '.join(missing)}")
        print("   Tạo file .env với các biến cần thiết.")
        return

    # Bước 1: Load files
    print("\n📂 [1/4] Đọc knowlegde-vault...")
    files = load_vault_files()
    if not files:
        print("❌ Không tìm thấy file .md nào trong knowlegde-vault.")
        return

    # Bước 2: Hybrid Chunking
    print(f"\n✂️  [2/4] Hybrid Chunking {len(files)} files...")
    all_chunks = []
    for filename, content in files:
        chunks = hybrid_chunk(content, filename)
        print(f"   📄 {filename} → {len(chunks)} chunks")
        all_chunks.extend(chunks)

    print(f"\n   📊 Tổng: {len(all_chunks)} chunks từ {len(files)} files")

    # Stats
    char_counts = [len(c["content"]) for c in all_chunks]
    print(f"   📏 Kích thước: min={min(char_counts)}, max={max(char_counts)}, "
          f"avg={sum(char_counts) // len(char_counts)}")

    # Bước 3: Embedding
    print(f"\n🧠 [3/4] Embedding với {EMBEDDING_MODEL}...")
    embedded_chunks = embed_in_batches(all_chunks)

    if not embedded_chunks:
        print("❌ Không có chunk nào được embed thành công.")
        return

    # Bước 4: Lưu vào Supabase
    print(f"\n💾 [4/4] Lưu vào Supabase ({TABLE_NAME})...")
    upsert_to_supabase(embedded_chunks)

    print("\n" + "=" * 60)
    print("✅ HOÀN TẤT!")
    print(f"   📄 Files: {len(files)}")
    print(f"   ✂️  Chunks: {len(all_chunks)}")
    print(f"   🧠 Embedded: {len(embedded_chunks)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
