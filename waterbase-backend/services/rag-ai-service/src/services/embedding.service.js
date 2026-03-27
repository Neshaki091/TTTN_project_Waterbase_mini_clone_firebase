import { GoogleGenerativeAI } from '@google/generative-ai';
import settings from '../config/settings.js';

class EmbeddingService {
  /**
   * Handles generation of high-dimensional vector embeddings.
   */
  constructor() {
    this.targetDim = settings.TARGET_DIMENSIONS;
    this.genAI = new GoogleGenerativeAI(settings.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" }); 
    // Gemini's embedding model. Adjust as needed.
  }

  _padEmbedding(embedding) {
    /** Pads the embedding to match the target dimensions. */
    if (embedding.length >= this.targetDim) {
      return embedding.slice(0, this.targetDim);
    }
    const padded = new Array(this.targetDim).fill(0);
    for (let i = 0; i < embedding.length; i++) {
      padded[i] = embedding[i];
    }
    return padded;
  }

  async embedText(text) {
    /** Embeds a single string. */
    try {
      const result = await this.model.embedContent(text);
      return this._padEmbedding(result.embedding.values);
    } catch (error) {
      console.error('Error embedding text:', error);
      throw error;
    }
  }

  async embedBatch(texts) {
    /** Embeds a batch of strings. */
    try {
      const result = await this.model.batchEmbedContents({
        requests: texts.map((t) => ({ content: { role: 'user', parts: [{ text: t }] } })),
      });
      return result.embeddings.map((emb) => this._padEmbedding(emb.values));
    } catch (error) {
      console.error('Error embedding batch:', error);
      throw error;
    }
  }
}

// Singleton helper
let instance = null;
export const getEmbeddingService = () => {
  if (!instance) {
    instance = new EmbeddingService();
  }
  return instance;
};
