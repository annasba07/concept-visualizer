/**
 * Memory Manager - MemAct-inspired context curation
 *
 * Implements learnable memory-editing operations:
 * - RETAIN: Keep high-importance segments in immediate memory
 * - COMPRESS: Summarize medium-importance segments
 * - DISCARD: Remove low-importance segments
 *
 * Based on "Memory as Action: Autonomous Context Curation for Long-Horizon Agentic Tasks"
 * (arxiv.org/pdf/2510.12635)
 */

import { MemorySegment, WorkingMemory } from '../../types/index.js';
import Anthropic from '@anthropic-ai/sdk';

export class MemoryManager {
  private memory: WorkingMemory;
  private client: Anthropic;
  private model: string;

  constructor(
    client: Anthropic,
    model: string = 'claude-sonnet-4-5-20250929',
    maxImmediateSize: number = 50000
  ) {
    this.client = client;
    this.model = model;
    this.memory = {
      immediate: [],
      compressed: [],
      archived: [],
      maxImmediateSize,
      compressionThreshold: 0.7,
    };
  }

  /**
   * Add new content to working memory
   * Automatically triggers curation if threshold exceeded
   */
  async add(
    content: string,
    type: 'context' | 'decision' | 'output' | 'error',
    importance?: number
  ): Promise<void> {
    const segment: MemorySegment = {
      id: this.generateId(),
      content,
      type,
      importance: importance ?? await this.assessImportance(content, type),
      timestamp: Date.now(),
      action: 'retain', // Default, will be determined by curation
    };

    this.memory.immediate.push(segment);

    // Check if curation is needed
    const currentSize = this.calculateMemorySize(this.memory.immediate);
    const threshold = this.memory.maxImmediateSize * this.memory.compressionThreshold;

    if (currentSize > threshold) {
      await this.curate();
    }
  }

  /**
   * Core curation logic - decides retain/compress/discard for each segment
   */
  async curate(): Promise<void> {
    console.log('[MemoryManager] Starting curation...');

    // Sort by importance (descending)
    this.memory.immediate.sort((a, b) => b.importance - a.importance);

    let retainedSize = 0;
    const targetSize = this.memory.maxImmediateSize * 0.5; // Keep immediate at 50% capacity

    for (const segment of this.memory.immediate) {
      const segmentSize = this.estimateTokens(segment.content);

      if (retainedSize + segmentSize <= targetSize && segment.importance >= 0.7) {
        // RETAIN: High importance, within budget
        segment.action = 'retain';
        retainedSize += segmentSize;
      } else if (segment.importance >= 0.3) {
        // COMPRESS: Medium importance
        segment.action = 'compress';
        segment.compressed = await this.compressContent(segment);
      } else {
        // DISCARD: Low importance
        segment.action = 'discard';
      }
    }

    // Apply actions
    const toRetain = this.memory.immediate.filter(s => s.action === 'retain');
    const toCompress = this.memory.immediate.filter(s => s.action === 'compress');
    const toArchive = this.memory.immediate.filter(s => s.action === 'discard');

    this.memory.immediate = toRetain;
    this.memory.compressed.push(...toCompress);
    this.memory.archived.push(...toArchive);

    // Prune old archived items (keep last 100)
    if (this.memory.archived.length > 100) {
      this.memory.archived = this.memory.archived.slice(-100);
    }

    console.log(`[MemoryManager] Curation complete: ${toRetain.length} retained, ${toCompress.length} compressed, ${toArchive.length} archived`);
  }

  /**
   * Assess importance of content using LLM
   */
  private async assessImportance(content: string, type: string): Promise<number> {
    // Fast heuristic-based importance for common cases
    if (type === 'error') return 0.9;
    if (type === 'output') return 0.8;
    if (type === 'decision') return 0.7;

    // For context, use content-based heuristics
    if (content.length < 100) return 0.3;
    if (content.includes('key principle') || content.includes('important')) return 0.8;
    if (content.includes('example') || content.includes('reference')) return 0.5;

    return 0.5; // Default medium importance
  }

  /**
   * Compress content using LLM summarization
   */
  private async compressContent(segment: MemorySegment): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Compress the following ${segment.type} into a concise summary (max 2-3 sentences). Preserve key facts and decisions:\n\n${segment.content}`
        }]
      });

      const compressed = response.content[0].type === 'text'
        ? response.content[0].text
        : segment.content;

      console.log(`[MemoryManager] Compressed ${segment.content.length} chars -> ${compressed.length} chars`);
      return compressed;
    } catch (error) {
      console.warn('[MemoryManager] Compression failed, using truncation:', error);
      return segment.content.slice(0, 200) + '...';
    }
  }

  /**
   * Get current context for agent
   * Returns immediate + compressed summaries
   */
  getContext(): string {
    const immediate = this.memory.immediate
      .map(s => `[${s.type.toUpperCase()}] ${s.content}`)
      .join('\n\n');

    const compressed = this.memory.compressed
      .map(s => `[SUMMARY] ${s.compressed || s.content}`)
      .join('\n');

    return `# Current Context\n\n${immediate}\n\n# Compressed History\n\n${compressed}`;
  }

  /**
   * Get full memory state for checkpointing
   */
  getMemoryState(): WorkingMemory {
    return { ...this.memory };
  }

  /**
   * Restore memory from checkpoint
   */
  restoreMemoryState(state: WorkingMemory): void {
    this.memory = state;
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.memory.immediate = [];
    this.memory.compressed = [];
    this.memory.archived = [];
  }

  /**
   * Search archived memory for retrieval
   */
  async search(query: string, limit: number = 5): Promise<MemorySegment[]> {
    // Simple keyword-based search in archived memory
    const allMemory = [
      ...this.memory.immediate,
      ...this.memory.compressed,
      ...this.memory.archived
    ];

    const queryLower = query.toLowerCase();
    const matches = allMemory.filter(segment =>
      segment.content.toLowerCase().includes(queryLower) ||
      (segment.compressed && segment.compressed.toLowerCase().includes(queryLower))
    );

    // Sort by importance and recency
    matches.sort((a, b) => {
      const importanceScore = b.importance - a.importance;
      const recencyScore = (b.timestamp - a.timestamp) / 1000000; // Normalize
      return importanceScore * 0.7 + recencyScore * 0.3;
    });

    return matches.slice(0, limit);
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    immediateCount: number;
    compressedCount: number;
    archivedCount: number;
    totalSize: number;
    utilizationPercent: number;
  } {
    const totalSize = this.calculateMemorySize(this.memory.immediate);

    return {
      immediateCount: this.memory.immediate.length,
      compressedCount: this.memory.compressed.length,
      archivedCount: this.memory.archived.length,
      totalSize,
      utilizationPercent: (totalSize / this.memory.maxImmediateSize) * 100,
    };
  }

  // Utility methods

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateMemorySize(segments: MemorySegment[]): number {
    return segments.reduce((sum, seg) => sum + this.estimateTokens(seg.content), 0);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
