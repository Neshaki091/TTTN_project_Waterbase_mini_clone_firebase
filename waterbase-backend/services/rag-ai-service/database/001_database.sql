-- ============================================================================
-- Waterbase RAG — Database Setup
-- Thiết lập pgvector extension, bảng documents, và RPC function match_documents
-- Chạy script này trong Supabase SQL Editor
-- ============================================================================

-- 1. Bật pgvector extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tạo bảng documents để lưu chunks + embeddings
CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL PRIMARY KEY,
    chunk_id    TEXT UNIQUE NOT NULL,           -- MD5 hash unique cho mỗi chunk
    content     TEXT NOT NULL,                   -- Nội dung chunk (markdown)
    heading     TEXT DEFAULT '',                 -- Heading section chứa chunk
    source      TEXT NOT NULL,                   -- Tên file gốc (vd: 01_sdk_overview.md)
    chunk_index INT DEFAULT 0,                   -- Thứ tự chunk trong file
    embedding   VECTOR(1536),                    -- Vector embedding từ Gemini (1536D cân bằng)
    metadata    JSONB DEFAULT '{}'::jsonb,       -- Metadata bổ sung
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo index cho tìm kiếm vector (IVFFlat — nhanh hơn cho dataset nhỏ-vừa)
CREATE INDEX IF NOT EXISTS idx_documents_embedding 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Index cho chunk_id (dùng cho upsert)
CREATE INDEX IF NOT EXISTS idx_documents_chunk_id 
ON documents (chunk_id);

-- Index cho source (dùng cho filter theo file)
CREATE INDEX IF NOT EXISTS idx_documents_source 
ON documents (source);

-- ============================================================================
-- 4. RPC Function: match_documents
-- Tìm kiếm semantic similarity — gọi từ retrived.py
-- ============================================================================

CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id              BIGINT,
    content         TEXT,
    heading         TEXT,
    source          TEXT,
    chunk_index     INT,
    similarity      FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.heading,
        d.source,
        d.chunk_index,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM documents d
    WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- 5. Row Level Security (RLS)
-- Cho phép service_role đọc/ghi, anon chỉ đọc
-- ============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Service role có full access
CREATE POLICY "Service role full access" ON documents
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy: Anonymous chỉ được đọc (cho RAG query)
CREATE POLICY "Anon read access" ON documents
    FOR SELECT
    USING (true);

-- ============================================================================
-- ✅ Hoàn tất! Bảng documents và function match_documents đã sẵn sàng.
-- Tiếp theo: chạy embedder.py để nạp dữ liệu, rồi dùng retrived.py để query.
-- ============================================================================
