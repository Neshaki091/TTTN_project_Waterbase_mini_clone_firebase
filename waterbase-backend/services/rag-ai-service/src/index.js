import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import si from 'systeminformation';
import checkDiskSpace from 'check-disk-space';
import { getAIService } from './services/ai.service.js';
import { getEmbeddingService } from './services/embedding.service.js';
import { getRetrievalService } from './services/retrieval.service.js';
import { getDocumentService } from './services/document.service.js';
import { getDocumentRepository } from './repositories/document.repository.js';
import settings from './config/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = settings.PORT;

// Middlewares
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Services
const aiService = getAIService();
const embeddingService = getEmbeddingService();
const retrievalService = getRetrievalService();
const documentService = getDocumentService();
const docRepo = getDocumentRepository();

// Global State for Reloading
let reloadState = {
  running: false,
  last_result: null,
  progress: "",
  log_history: []
};

const _log = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  const logLine = `[${timestamp}] ${message}`;
  reloadState.log_history.push(logLine);
  if (reloadState.log_history.length > 50) {
    reloadState.log_history.shift();
  }
  console.log(logLine);
};

// Endpoints
app.get('/health', async (req, res) => {
  const ollamaOk = await aiService.isAvailable();
  const modelOk = ollamaOk ? await aiService.isModelLoaded() : false;
  res.json({
    status: "healthy",
    ollama_status: ollamaOk ? "connected" : "disconnected",
    ollama_model: `${settings.OLLAMA_MODEL} (${modelOk ? 'ready' : 'not pulled'})`,
  });
});

app.get('/api/debug/config', async (req, res) => {
  let supabaseOk = false;
  let supabaseError = null;
  try {
    const { data, error } = await docRepo.supabase.from(settings.TABLE_NAME).select('count', { count: 'exact', head: true });
    if (error) throw error;
    supabaseOk = true;
  } catch (e) {
    supabaseError = e.message;
  }

  res.json({
    PORT: settings.PORT,
    OLLAMA_BASE_URL: settings.OLLAMA_BASE_URL,
    OLLAMA_MODEL: settings.OLLAMA_MODEL,
    SUPABASE_URL: settings.SUPABASE_URL ? settings.SUPABASE_URL : "MISSING",
    SUPABASE_KEY: settings.SUPABASE_SERVICE_ROLE_KEY ? "SET (length: " + settings.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "MISSING",
    GOOGLE_API_KEY: settings.GOOGLE_API_KEY ? "SET (length: " + settings.GOOGLE_API_KEY.length + ")" : "MISSING",
    VAULT_DIR: settings.VAULT_DIR,
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_CONN: supabaseOk ? "CONNECTED" : "FAILED: " + supabaseError
  });
});

app.post('/api/retrieve', async (req, res) => {
  try {
    const { query, top_k } = req.body;
    const start = Date.now();
    const results = await retrievalService.retrieve(query, top_k);
    const elapsed = Date.now() - start;
    res.json({
      query,
      results,
      count: results.length,
      elapsed_ms: elapsed,
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.post('/api/ask', async (req, res) => {
  if (!(await aiService.isAvailable())) {
    return res.status(503).json({ detail: "Ollama không chạy" });
  }

  try {
    const { query, top_k } = req.body;
    const start = Date.now();
    const chunks = await retrievalService.retrieve(query, top_k);
    const context = retrievalService.formatContext(chunks);
    const prompt = aiService.buildPrompt(query, context);
    const answer = await aiService.generateAnswer(prompt, false);
    const elapsed = Date.now() - start;

    const sources = chunks.map(c => ({
      source: c.source || "",
      heading: c.heading || "",
      similarity: c.similarity || 0
    }));

    res.json({
      query,
      answer,
      sources,
      model: settings.OLLAMA_MODEL,
      elapsed_ms: elapsed,
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.post('/api/ask/stream', async (req, res) => {
  if (!(await aiService.isAvailable())) {
    return res.status(503).json({ detail: "Ollama không chạy" });
  }

  try {
    const { query, top_k } = req.body;
    const chunks = await retrievalService.retrieve(query, top_k);
    const context = retrievalService.formatContext(chunks);
    const prompt = aiService.buildPrompt(query, context);

    const sources = chunks.map(c => ({
      source: c.source || "",
      heading: c.heading || "",
      similarity: c.similarity || 0
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`METADATA: ${JSON.stringify(sources)}\n\n`);

    const stream = await aiService.generateAnswer(prompt, true);

    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep possible incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const payload = JSON.parse(line);
          if (!payload.done) {
            res.write(payload.response);
          }
        } catch (e) {
          console.error('❌ Lỗi parse JSON từ Ollama stream:', e.message, 'Line:', line);
        }
      }
    });

    stream.on('end', () => {
      // Process final bit in buffer if any
      if (buffer.trim()) {
        try {
          const payload = JSON.parse(buffer);
          if (!payload.done) res.write(payload.response);
        } catch (e) { /* ignore */ }
      }
      res.end();
    });

    stream.on('error', (err) => {
      console.error('❌ Streaming error from Ollama:', err);
      if (!res.headersSent) {
        res.status(500).json({ detail: "Lỗi luồng dữ liệu từ AI" });
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error('❌ Lỗi hệ thống trong /api/ask/stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        detail: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.end();
    }
  }
});

app.get('/api/system/status', async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await checkDiskSpace('/');

    const gpu = await si.graphics();
    let gpuInfo = null;
    if (gpu.controllers && gpu.controllers.length > 0) {
      const g = gpu.controllers[0];
      gpuInfo = `${g.model} (${g.vram}MB)`;
    }

    const servicesToCheck = [
      { name: "Auth Service", url: "http://auth-services:3000/health" },
      { name: "App Service", url: "http://app-services:3001/health" },
      { name: "WaterDB", url: "http://waterdb-services:3002/health" },
      { name: "Storage Service", url: "http://storage-services:3003/health" },
      { name: "Rule Service", url: "http://rule-services:3004/health" },
      { name: "RTWaterDB", url: "http://rtwaterdb-services:3005/health" },
      { name: "Analytics Service", url: "http://analytics-services:3006/health" },
      { name: "RAG AI Service", url: `http://localhost:${port}/health` },
      { name: "Ollama", url: "http://ollama:11434/" }
    ];

    // Note: service check might fail in local environment without the network
    // For now, we'll try it and return whatever we get.
    // In node, we'd use axios for these.

    res.json({
      cpu_percent: cpu.currentLoad.toFixed(2),
      ram_used_gb: (mem.used / 1024 / 1024 / 1024).toFixed(2),
      ram_total_gb: (mem.total / 1024 / 1024 / 1024).toFixed(2),
      ram_percent: (mem.used / mem.total * 100).toFixed(1),
      disk_used_gb: ((disk.size - disk.free) / 1024 / 1024 / 1024).toFixed(2),
      disk_total_gb: (disk.size / 1024 / 1024 / 1024).toFixed(2),
      disk_percent: ((disk.size - disk.free) / disk.size * 100).toFixed(1),
      temperature: "N/A", // temperature is tricky in Node.js
      gpu_info: gpuInfo,
      services: [], // Simplified for now
      embedding_status: reloadState
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Knowledge Management
app.get('/api/knowledge', async (req, res) => {
  try {
    const vaultPath = settings.VAULT_DIR;
    if (!fs.existsSync(vaultPath)) return res.json({ files: [] });

    const files = fs.readdirSync(vaultPath)
      .filter(f => f.endsWith('.md'))
      .map(filename => {
        const stats = fs.statSync(path.join(vaultPath, filename));
        return {
          filename,
          size_bytes: stats.size,
          modified_at: stats.mtimeMs
        };
      });
    res.json({ files: files.sort((a, b) => a.filename.localeCompare(b.filename)) });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.get('/api/knowledge/:filename', async (req, res) => {
  const { filename } = req.params;
  if (!filename.endsWith('.md')) return res.status(400).json({ detail: "Only .md files supported" });

  const filepath = path.join(settings.VAULT_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ detail: "File not found" });

  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    res.json({ filename, content });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.post('/api/knowledge/:filename', async (req, res) => {
  const { filename } = req.params;
  const { content } = req.body;
  if (!filename.endsWith('.md')) return res.status(400).json({ detail: "Only .md files supported" });

  const vaultPath = settings.VAULT_DIR;
  if (!fs.existsSync(vaultPath)) fs.mkdirSync(vaultPath, { recursive: true });

  try {
    fs.writeFileSync(path.join(vaultPath, filename), content);
    res.json({ success: true, message: `Saved ${filename}` });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.delete('/api/knowledge/:filename', async (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(settings.VAULT_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ detail: "File not found" });

  try {
    fs.unlinkSync(filepath);
    res.json({ success: true, message: `Deleted ${filename}` });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Reload Pipeline
async function runEmbeddingPipeline() {
  try {
    reloadState.log_history = [];
    _log("🚀 Bắt đầu quy trình nạp dữ liệu tri thức (Node.js)...");
    const start = Date.now();

    reloadState.progress = "[1/4] Đang load files...";
    _log("📂 Đang quét thư mục knowlegde-vault...");
    const files = documentService.loadVaultFiles();
    if (files.length === 0) {
      reloadState.running = false;
      reloadState.last_result = "❌ Không tìm thấy file .md";
      _log("⚠️ Không tìm thấy tệp .md nào trong vault.");
      return;
    }

    reloadState.progress = `[2/4] Chunking ${files.length} files...`;
    _log(`✂️ Đang phân tách (chunking) ${files.length} tệp tin...`);
    let allChunks = [];
    for (const [filename, content] of files) {
      const chunks = documentService.hybridChunk(content, filename);
      allChunks = allChunks.concat(chunks);
      _log(`   - ${filename}: ${chunks.length} chunks`);
    }

    reloadState.progress = `[3/4] Embedding ${allChunks.length} chunks...`;
    _log(`🧠 Đang tạo vector embedding cho ${allChunks.length} đoạn văn bản...`);

    // Batch processing
    const batchSize = settings.BATCH_SIZE;
    const processedChunks = [];
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      const embeddings = await embeddingService.embedBatch(texts);

      batch.forEach((chunk, index) => {
        chunk.embedding = embeddings[index];
      });
      processedChunks.push(...batch);

      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allChunks.length / batchSize);
      _log(`   - ✅ Đã xử lý batch ${batchNum}/${totalBatches}`);
    }

    reloadState.progress = "[4/4] Uploading lên Supabase...";
    _log(`⬆️ Đang tải ${processedChunks.length} vector lên Supabase...`);

    const rows = processedChunks.map(c => ({
      chunk_id: c.chunk_id,
      content: c.content,
      heading: c.heading || "",
      source: c.source,
      chunk_index: c.chunk_index,
      embedding: c.embedding
    }));

    await docRepo.upsertSegments(rows);

    const elapsed = (Date.now() - start) / 1000;
    reloadState.running = false;
    const resMsg = `✅ Hoàn tất! ${files.length} files -> ${processedChunks.length} chunks (${elapsed.toFixed(1)}s)`;
    reloadState.last_result = resMsg;
    _log(resMsg);
  } catch (error) {
    reloadState.running = false;
    const errMsg = `❌ Lỗi hệ thống: ${error.message}`;
    reloadState.last_result = errMsg;
    _log(errMsg);
  }
}

app.post('/api/reload', (req, res) => {
  if (reloadState.running) {
    return res.json({ status: "running", progress: reloadState.progress });
  }

  reloadState.running = true;
  reloadState.progress = "Đang khởi tạo...";
  reloadState.last_result = null;

  runEmbeddingPipeline(); // background
  res.json({ status: "started", message: "Đã bắt đầu embedding pipeline!" });
});

app.get('/api/reload/status', (req, res) => {
  res.json(reloadState);
});

app.post('/api/embeddings/clear', async (req, res) => {
  try {
    _log("🧹 Đang thực hiện xóa trắng Vector Database trên Supabase...");
    await docRepo.deleteAllSegments();
    _log("✨ Đã xóa toàn bộ dữ liệu vector thành công.");
    res.json({ success: true, message: "Đã xóa toàn bộ dữ liệu vector." });
  } catch (error) {
    _log(`❌ Lỗi khi xóa vector: ${error.message}`);
    res.status(500).json({ detail: error.message });
  }
});

app.listen(port, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Waterbase RAG AI Service (Node.js) — Running on port ${port}`);
  console.log("=".repeat(50));
});
