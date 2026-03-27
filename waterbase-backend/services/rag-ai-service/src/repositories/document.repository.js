import { createClient } from '@supabase/supabase-js';
import settings from '../config/settings.js';

class DocumentRepository {
  /**
   * Handles all interactions with Supabase for documents and vector search.
   */
  constructor() {
    this.supabase = createClient(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY);
  }

  async searchSimilar(queryEmbedding, topK = null, threshold = null) {
    /** Finds similar documents using vector similarity search. */
    const { data, error } = await this.supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold || settings.SIMILARITY_THRESHOLD,
      match_count: topK || settings.TOP_K_CHUNKS,
    });

    if (error) {
      console.error('Error in searchSimilar:', error);
      throw error;
    }
    return data || [];
  }

  async upsertSegments(rows) {
    /** Bulk upserts document segments with embeddings. */
    const { error } = await this.supabase
      .from(settings.TABLE_NAME)
      .upsert(rows, { onConflict: 'chunk_id' });

    if (error) {
      console.error('Error in upsertSegments:', error);
      throw error;
    }
  }

  async deleteAllSegments() {
    /** Deletes all document segments from the table. */
    const { error } = await this.supabase
      .from(settings.TABLE_NAME)
      .delete()
      .neq('content', '');

    if (error) {
      console.error('Error in deleteAllSegments:', error);
      throw error;
    }
  }
}

// Singleton helper
let instance = null;
export const getDocumentRepository = () => {
  if (!instance) {
    instance = new DocumentRepository();
  }
  return instance;
};
