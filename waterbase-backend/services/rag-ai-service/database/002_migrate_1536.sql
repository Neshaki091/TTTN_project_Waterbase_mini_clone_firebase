-- ============================================================================
-- Migration: VECTOR(768) → VECTOR(1536)
-- Cân bằng giữa độ chính xác và hiệu suất
-- Chạy script này trong Supabase SQL Editor
-- ============================================================================

-- 1. Xóa dữ liệu cũ (embedding cũ 768D không dùng được với 1536D)
TRUNCATE TABLE documents;

-- 2. Xóa index cũ
DROP INDEX IF EXISTS idx_documents_embedding;

-- 3. Đổi cột embedding sang 1536 dimensions
ALTER TABLE documents
ALTER COLUMN embedding TYPE VECTOR(1536);

-- 4. Tạo lại index
CREATE INDEX idx_documents_embedding
ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- 5. Cập nhật function match_documents
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
-- ✅ Migration hoàn tất!
-- Tiếp theo: restart server → truy cập /api/embed để chạy lại embedding
-- ============================================================================
