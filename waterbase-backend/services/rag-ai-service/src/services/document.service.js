import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import settings from '../config/settings.js';

class DocumentService {
  /**
   * Handles document loading and chunking (Structural -> Semantic -> Fixed-size).
   */
  loadVaultFiles() {
    /** Reads all .md files from knowledge-vault. */
    const files = [];
    const vaultPath = settings.VAULT_DIR;
    
    if (!fs.existsSync(vaultPath)) {
      return files;
    }

    const mdFiles = fs.readdirSync(vaultPath)
      .filter(file => file.endsWith('.md'))
      .sort();

    for (const filename of mdFiles) {
      const content = fs.readFileSync(path.join(vaultPath, filename), 'utf-8');
      if (content.trim()) {
        files.push([filename, content]);
      }
    }
    return files;
  }

  splitByHeadings(text) {
    /** Structural Split: Chia markdown theo headings (# ## ### ####). */
    const headingPattern = /^(#{1,4})\s+(.+)$/gm;
    const sections = [];
    let match;
    let lastIndex = 0;
    const matches = [];

    while ((match = headingPattern.exec(text)) !== null) {
      matches.push(match);
    }

    if (matches.length === 0) {
      return [{ heading: "", level: 0, content: text.trim() }];
    }

    const preamble = text.substring(0, matches[0].index).trim();
    if (preamble) {
      sections.push({ heading: "", level: 0, content: preamble });
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const level = match[1].length;
      const heading = match[2].trim();
      const start = headingPattern.lastIndex;
      const end = matches[i + 1] ? matches[i + 1].index : text.length;
      const content = text.substring(match.index + match[0].length, end).trim();
      
      sections.push({
        heading: heading,
        level: level,
        content: content ? `${'#'.repeat(level)} ${heading}\n\n${content}` : `${'#'.repeat(level)} ${heading}`,
      });
    }
    return sections;
  }

  hybridChunk(text, sourceFile) {
    /** Hybrid Chunking Pipeline: Structural -> Semantic -> Fixed-size. */
    const allChunks = [];
    const sections = this.splitByHeadings(text);

    for (const section of sections) {
      const content = section.content;
      if (content.length <= settings.MAX_CHUNK_CHARS) {
        if (content.length >= settings.MIN_CHUNK_CHARS) {
          allChunks.push({
            content: content,
            heading: section.heading,
            source: sourceFile,
          });
        }
      } else {
        // Basic split if too long (Semantic Split placeholder)
        const parts = content.split(/\n\s*\n/);
        let current = "";
        for (const part of parts) {
          if (current.length + part.length < settings.MAX_CHUNK_CHARS) {
            current += (current ? "\n\n" : "") + part;
          } else {
            if (current.length >= settings.MIN_CHUNK_CHARS) {
              allChunks.push({ content: current, heading: section.heading, source: sourceFile });
            }
            current = part;
          }
        }
        if (current && current.length >= settings.MIN_CHUNK_CHARS) {
          allChunks.push({ content: current, heading: section.heading, source: sourceFile });
        }
      }
    }

    allChunks.forEach((chunk, i) => {
      chunk.chunk_index = i;
      const baseString = `${sourceFile}:${i}:${chunk.content.substring(0, 50)}`;
      chunk.chunk_id = crypto.createHash('md5').update(baseString).digest('hex');
    });

    return allChunks;
  }
}

// Singleton helper
let instance = null;
export const getDocumentService = () => {
  if (!instance) {
    instance = new DocumentService();
  }
  return instance;
};
