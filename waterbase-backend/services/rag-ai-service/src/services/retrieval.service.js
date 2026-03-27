import { getDocumentRepository } from '../repositories/document.repository.js';
import { getEmbeddingService } from './embedding.service.js';
import settings from '../config/settings.js';

class RetrievalService {
  /**
   * Combines embedding and repository search to retrieve relevant documents.
   */
  constructor() {
    this.docRepo = getDocumentRepository();
    this.embeddingService = getEmbeddingService();
  }

  async retrieve(query, topK = null) {
    /** Main retrieval pipeline: query -> embed -> search. */
    const queryEmbedding = await this.embeddingService.embedText(query);
    return await this.docRepo.searchSimilar(queryEmbedding, topK);
  }

  formatContext(chunks, maxChars = null) {
    /** Formats list of chunks into a context string. */
    if (!chunks || chunks.length === 0) {
      return "Không tìm thấy tài liệu liên quan.";
    }

    const max = maxChars || settings.MAX_CONTEXT_CHARS;
    const contextParts = [];
    let totalChars = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const source = chunk.source || "unknown";
      const heading = chunk.heading || "";
      const similarity = chunk.similarity || 0;
      const content = chunk.content || "";

      const header = `--- [Tài liệu ${i + 1}] ${source}${heading ? ' > ' + heading : ''} (độ liên quan: ${(similarity * 100).toFixed(0)}%) ---`;
      const section = `${header}\n${content}\n`;

      if (totalChars + section.length > max) {
        const remaining = max - totalChars;
        if (remaining > 200) {
          contextParts.push(section.substring(0, remaining) + "\n... (đã cắt bớt)");
        }
        break;
      }

      contextParts.push(section);
      totalChars += section.length;
    }

    return contextParts.join("\n");
  }
}

// Singleton helper
let instance = null;
export const getRetrievalService = () => {
  if (!instance) {
    instance = new RetrievalService();
  }
  return instance;
};
