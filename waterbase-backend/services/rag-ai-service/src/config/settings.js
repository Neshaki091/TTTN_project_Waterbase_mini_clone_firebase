import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settings = {
  // API Keys
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // Ollama Config
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:1.5b",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",

  // RAG Config
  USE_LOCAL_EMBEDDER: process.env.USE_LOCAL_EMBEDDER === 'true' || true,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "BAAI/bge-small-en-v1.5",
  TARGET_DIMENSIONS: parseInt(process.env.TARGET_DIMENSIONS || "1536"),
  TOP_K_CHUNKS: parseInt(process.env.TOP_K_CHUNKS || "5"),
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD || "0.45"),
  MAX_CONTEXT_CHARS: parseInt(process.env.MAX_CONTEXT_CHARS || "6000"),

  // Chunking Config
  MAX_CHUNK_CHARS: parseInt(process.env.MAX_CHUNK_CHARS || "1500"),
  MIN_CHUNK_CHARS: parseInt(process.env.MIN_CHUNK_CHARS || "100"),
  OVERLAP_CHARS: parseInt(process.env.OVERLAP_CHARS || "150"),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || "5"),
  API_DELAY: parseInt(process.env.API_DELAY || "10"),

  // Paths
  VAULT_DIR: process.env.VAULT_DIR || path.resolve(__dirname, '../../knowlegde-vault'),
  TABLE_NAME: process.env.TABLE_NAME || "documents",
  
  PORT: parseInt(process.env.PORT || "3007")
};

export default settings;
