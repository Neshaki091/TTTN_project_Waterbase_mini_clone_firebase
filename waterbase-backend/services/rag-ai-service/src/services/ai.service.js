import axios from 'axios';
import settings from '../config/settings.js';

class AIService {
  /**
   * Handles interactions with the large language model via Ollama.
   */
  constructor() {
    this.baseUrl = settings.OLLAMA_BASE_URL;
    this.model = settings.OLLAMA_MODEL;
    this.systemPrompt = `Bạn là Waterbase AI Assistant chuyên về Waterbase SDK.
Quy tắc trả lời:
1. PHÂN TÍCH Ý ĐỊNH: Nếu câu hỏi rộng (vd: "tạo app chat"), hãy đưa ra lộ trình tổng quan (các service cần dùng) trước. ĐỪNG liệt kê chi tiết kỹ thuật chuyên sâu trừ khi được hỏi cụ thể.
2. TỔNG HỢP THÔNG TIN: Không liệt kê từng đoạn context rời rạc. Hãy kết nối các ý thành một câu trả lời mạch lạc.
3. NGẮN GỌN & TẬP TRUNG: Đi thẳng vào vấn đề. Loại bỏ mọi thông tin không trực tiếp trả lời câu hỏi.
4. CODE SNIPPET: Chỉ cung cấp code mẫu khi thực sự cần thiết và phải đúng ngữ cảnh.
5. CHỐNG ẢO GIÁC: Chỉ trả lời dựa trên Context. Nếu không biết, hãy nói "Tôi không có thông tin về vấn đề này".`;
  }

  async isAvailable() {
    /** Checks if Ollama is running. */
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async isModelLoaded() {
    /** Checks if the configured model is available in Ollama. */
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      if (response.status === 200) {
        const models = response.data.models || [];
        return models.some(m => m.name.includes(this.model));
      }
    } catch (error) {
      // Ignore
    }
    return false;
  }

  buildPrompt(query, context) {
    /** Builds the RAG prompt. */
    return `Context:\n${context}\n\nQ: ${query}\nA:`;
  }

  async generateAnswer(prompt, stream = false) {
    /** Calls Ollama to generate an answer. */
    const url = `${this.baseUrl}/api/generate`;
    const payload = {
      model: this.model,
      prompt: prompt,
      system: this.systemPrompt,
      stream: stream,
      options: {
        temperature: 0.1,
        num_predict: 1024,
        num_ctx: 8192,
        repeat_penalty: 1.15,
        top_k: 40,
        top_p: 0.9
      },
    };

    if (stream) {
      const response = await axios.post(url, payload, { responseType: 'stream' });
      return response.data;
    } else {
      const response = await axios.post(url, payload);
      return response.data.response;
    }
  }
}

// Singleton helper
let instance = null;
export const getAIService = () => {
  if (!instance) {
    instance = new AIService();
  }
  return instance;
};
