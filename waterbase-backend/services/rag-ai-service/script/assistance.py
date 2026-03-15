"""
Waterbase RAG — AI Assistant Module
Dùng local model (Ollama) kết hợp RAG context để trả lời câu hỏi về Waterbase SDK.

Pipeline: Câu hỏi → Retrieve context (retrived.py) → Build prompt → Generate (Ollama) → Trả lời

Yêu cầu:
  - Ollama đang chạy tại localhost:11434
  - Model đã pull: ollama pull qwen2.5:7b (hoặc model khác)
  - Đã chạy embedder.py để nạp dữ liệu vào Supabase

Cách dùng:
  - Single query:   python assistance.py "câu hỏi"
  - Interactive:     python assistance.py
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# Import retriever từ cùng thư mục
from retrived import retrieve, format_context

# ============================================================================
# CẤU HÌNH
# ============================================================================

load_dotenv()

# Ollama config
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Generation params
TEMPERATURE = 0.3           # Low = chính xác hơn, ít sáng tạo
TOP_K_CHUNKS = 5            # Số chunks retrieve cho mỗi câu hỏi
MAX_CONTEXT_CHARS = 6000    # Giới hạn context đưa vào prompt
STREAM_OUTPUT = True        # Stream từng token ra terminal

# ============================================================================
# SYSTEM PROMPT — Persona của AI Assistant
# ============================================================================

SYSTEM_PROMPT = """Bạn là **Waterbase AI Assistant** — trợ lý AI chuyên về Waterbase SDK và Backend.

## Vai trò
- Bạn là Senior Developer có kinh nghiệm sâu về Waterbase SDK (tương tự Firebase).
- Bạn trả lời bằng **tiếng Việt**, rõ ràng và dễ hiểu.
- Bạn luôn dựa trên tài liệu được cung cấp (context) để trả lời chính xác.

## Quy tắc trả lời
1. **Dựa trên context**: Chỉ trả lời dựa trên tài liệu được cung cấp. Nếu không có thông tin, nói rõ "Tôi không tìm thấy thông tin này trong tài liệu."
2. **Có code example**: Khi giải thích API hoặc cách dùng, luôn kèm code example bằng JavaScript.
3. **Cấu trúc rõ ràng**: Dùng heading, bullet points, và code blocks để format câu trả lời.
4. **Cảnh báo lỗi thường gặp**: Nếu liên quan, nhắc các lỗi thường gặp và cách xử lý.
5. **Ngắn gọn nhưng đầy đủ**: Không lặp lại thông tin, không thêm thông tin bịa đặt.

## Phong cách
- Thân thiện, chuyên nghiệp
- Dùng emoji phù hợp (📌 cho lưu ý, ⚠️ cho cảnh báo, ✅ cho ví dụ đúng)
- Khi có nhiều cách làm, so sánh ưu nhược điểm"""


# ============================================================================
# PROMPT BUILDER — Tạo prompt với RAG context
# ============================================================================

def build_prompt(query: str, context: str) -> str:
    """
    Tạo prompt hoàn chỉnh với context từ RAG retriever.
    Format theo kiểu instruction-following phù hợp local model.
    """
    return f"""Dưới đây là các tài liệu tham khảo từ Waterbase SDK documentation:

<context>
{context}
</context>

Dựa vào tài liệu trên, hãy trả lời câu hỏi sau:

**Câu hỏi**: {query}

Hãy trả lời bằng tiếng Việt, kèm code example nếu phù hợp."""


# ============================================================================
# OLLAMA API — Gọi local model
# ============================================================================

def check_ollama_status() -> bool:
    """Kiểm tra Ollama có đang chạy không."""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except requests.ConnectionError:
        return False


def check_model_available(model: str) -> bool:
    """Kiểm tra model đã được pull chưa."""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            # Kiểm tra cả tên đầy đủ (qwen2.5:7b) và tên ngắn (qwen2.5)
            return any(model in name or name.startswith(model.split(":")[0])
                       for name in model_names)
    except Exception:
        pass
    return False


def generate_answer(prompt: str, model: str = None, stream: bool = STREAM_OUTPUT) -> str:
    """
    Gọi Ollama API để sinh câu trả lời.

    Args:
        prompt: Prompt đã build (có context)
        model: Tên model Ollama (mặc định từ .env)
        stream: Có stream output ra terminal không

    Returns:
        Câu trả lời hoàn chỉnh từ model
    """
    model = model or OLLAMA_MODEL
    url = f"{OLLAMA_BASE_URL}/api/generate"

    payload = {
        "model": model,
        "prompt": prompt,
        "system": SYSTEM_PROMPT,
        "stream": stream,
        "options": {
            "temperature": TEMPERATURE,
            "top_p": 0.9,
            "num_predict": 2048,    # Max tokens sinh ra
        },
    }

    try:
        if stream:
            # Streaming mode — in từng token
            response = requests.post(url, json=payload, stream=True, timeout=120)
            response.raise_for_status()

            full_response = ""
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line)
                    token = chunk.get("response", "")
                    full_response += token
                    print(token, end="", flush=True)

                    if chunk.get("done", False):
                        break

            print()  # Newline sau khi stream xong
            return full_response

        else:
            # Non-streaming mode — nhận cả response 1 lần
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")

    except requests.ConnectionError:
        return "❌ Không kết nối được Ollama. Hãy chạy: ollama serve"
    except requests.Timeout:
        return "❌ Timeout — model mất quá lâu để trả lời. Thử model nhỏ hơn?"
    except Exception as e:
        return f"❌ Lỗi khi gọi Ollama: {e}"


# ============================================================================
# ASK — Pipeline chính: Retrieve → Build → Generate
# ============================================================================

def ask(query: str, top_k: int = TOP_K_CHUNKS, verbose: bool = True) -> str:
    """
    Pipeline RAG hoàn chỉnh:
      1. Retrieve context từ Supabase (qua retrived.py)
      2. Build prompt với context
      3. Generate câu trả lời bằng local model (Ollama)

    Args:
        query: Câu hỏi người dùng
        top_k: Số chunks retrieve
        verbose: In thông tin chi tiết

    Returns:
        Câu trả lời từ AI
    """
    if verbose:
        print(f"\n{'='*60}")
        print(f"🤖 WATERBASE AI ASSISTANT")
        print(f"   Model: {OLLAMA_MODEL} (local)")
        print(f"{'='*60}")

    # Bước 1: Retrieve context
    if verbose:
        print(f"\n📚 [1/3] Retrieve context...")
    chunks = retrieve(query, top_k=top_k)

    if not chunks:
        no_context_msg = ("Xin lỗi, tôi không tìm thấy tài liệu liên quan đến "
                          f"câu hỏi \"{query}\". Hãy thử hỏi cách khác hoặc "
                          "kiểm tra lại dữ liệu trong knowledge vault.")
        if verbose:
            print(f"\n⚠️  {no_context_msg}")
        return no_context_msg

    # Bước 2: Build prompt
    if verbose:
        print(f"\n📝 [2/3] Build prompt với {len(chunks)} chunks context...")
    context = format_context(chunks, max_chars=MAX_CONTEXT_CHARS)
    prompt = build_prompt(query, context)

    if verbose:
        print(f"   📏 Prompt length: {len(prompt):,} chars")

    # Bước 3: Generate
    if verbose:
        print(f"\n🧠 [3/3] Generating với {OLLAMA_MODEL}...")
        print(f"{'─'*60}")

    start = time.time()
    answer = generate_answer(prompt, stream=STREAM_OUTPUT)
    gen_time = time.time() - start

    if verbose:
        print(f"{'─'*60}")
        print(f"⏱️  Thời gian sinh: {gen_time:.1f}s")

    return answer


# ============================================================================
# CHAT LOOP — Chế độ hỏi đáp liên tục
# ============================================================================

def chat_loop():
    """Interactive chat loop — hỏi đáp liên tục với AI Assistant."""
    global OLLAMA_MODEL

    print(f"""
{'='*60}
🤖 WATERBASE AI ASSISTANT — Interactive Mode
   Model: {OLLAMA_MODEL} (local via Ollama)
   RAG:   Supabase pgvector + Gemini Embedding

   Gõ 'exit' hoặc 'quit' để thoát.
   Gõ 'model <tên>' để đổi model.
   Gõ 'clear' để xóa màn hình.
{'='*60}
""")

    while True:
        try:
            query = input("❓ Bạn: ").strip()

            if not query:
                continue

            # Commands
            if query.lower() in ("exit", "quit", "q", "thoát"):
                print("👋 Tạm biệt! Chúc bạn code vui vẻ!")
                break

            if query.lower() == "clear":
                os.system("cls" if os.name == "nt" else "clear")
                continue

            if query.lower().startswith("model "):
                new_model = query[6:].strip()
                if new_model:
                    OLLAMA_MODEL = new_model
                    print(f"🔄 Đã đổi model sang: {OLLAMA_MODEL}")
                continue

            if query.lower() == "help":
                print("""
📖 Các lệnh:
   exit/quit/q  — Thoát
   model <tên>  — Đổi model (vd: model gemma3:4b)
   clear        — Xóa màn hình
   help         — Hiện trợ giúp
                """)
                continue

            # Hỏi AI
            print()
            answer = ask(query, verbose=True)
            print()

        except KeyboardInterrupt:
            print("\n👋 Tạm biệt!")
            break
        except Exception as e:
            print(f"\n❌ Lỗi: {e}\n")


# ============================================================================
# MAIN — CLI Entrypoint
# ============================================================================

def main():
    """
    CLI entrypoint:
      - python assistance.py                    → Interactive chat
      - python assistance.py "câu hỏi"         → Single query
      - python assistance.py --check            → Kiểm tra Ollama status
    """

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

    # --check flag: kiểm tra Ollama
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        print(f"🔍 Kiểm tra Ollama tại {OLLAMA_BASE_URL}...")

        if check_ollama_status():
            print("   ✅ Ollama đang chạy!")

            if check_model_available(OLLAMA_MODEL):
                print(f"   ✅ Model '{OLLAMA_MODEL}' đã sẵn sàng!")
            else:
                print(f"   ⚠️  Model '{OLLAMA_MODEL}' chưa được pull.")
                print(f"   👉 Chạy: ollama pull {OLLAMA_MODEL}")
        else:
            print("   ❌ Ollama không chạy!")
            print("   👉 Chạy: ollama serve")
        return

    # Kiểm tra Ollama trước khi bắt đầu
    if not check_ollama_status():
        print(f"❌ Ollama không chạy tại {OLLAMA_BASE_URL}")
        print(f"   👉 Bước 1: Cài Ollama từ https://ollama.com")
        print(f"   👉 Bước 2: Chạy 'ollama serve'")
        print(f"   👉 Bước 3: Pull model 'ollama pull {OLLAMA_MODEL}'")
        return

    if not check_model_available(OLLAMA_MODEL):
        print(f"⚠️  Model '{OLLAMA_MODEL}' chưa được pull.")
        print(f"   👉 Chạy: ollama pull {OLLAMA_MODEL}")
        print(f"   Hoặc đổi model trong .env: OLLAMA_MODEL=gemma3:4b")
        return

    # Single query mode
    if len(sys.argv) > 1:
        query = sys.argv[1]
        ask(query, verbose=True)
        return

    # Interactive chat mode
    chat_loop()


if __name__ == "__main__":
    main()
