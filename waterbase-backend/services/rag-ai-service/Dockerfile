# ============================================
# Waterbase RAG AI Service — Dockerfile
# Python-based microservice (FastAPI + Ollama)
# ============================================

FROM python:3.11-slim

WORKDIR /app

# Cài dependencies trước (cache layer)
COPY services/rag-ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY services/rag-ai-service/script/ ./
COPY services/rag-ai-service/knowlegde-vault/ ./knowlegde-vault/

EXPOSE 3007

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
    CMD python -c "import requests; r=requests.get('http://localhost:3007/health'); exit(0 if r.status_code==200 else 1)" || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3007"]
