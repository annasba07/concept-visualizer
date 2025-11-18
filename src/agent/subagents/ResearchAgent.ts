/**
 * Research Agent - Autonomous concept research subagent
 *
 * Responsibilities:
 * - Web search for concept explanations
 * - Find existing visualizations
 * - Extract key principles
 * - Compress findings for memory efficiency
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Concept,
  ResearchFindings,
  SubagentResponse,
} from '../../types/index.js';

export class ResearchAgent {
  private client: Anthropic;
  private model: string;

  constructor(client: Anthropic, model: string = 'claude-sonnet-4-5-20250929') {
    this.client = client;
    this.model = model;
  }

  /**
   * Research a concept and return comprehensive findings
   */
  async research(concept: Concept): Promise<SubagentResponse<ResearchFindings>> {
    console.log('[ResearchAgent] Starting research for:', concept.input);

    const startTime = Date.now();
    let toolCalls = 0;
    let tokensUsed = 0;

    try {
      // Simulate web search and research
      const prompt = `Research the concept: "${concept.input}"

Domain: ${concept.domain}
Type: ${concept.type}
Complexity: ${concept.complexity}

Provide comprehensive research findings in this JSON format:
{
  "summary": "2-3 sentence overview",
  "keyPrinciples": ["principle 1", "principle 2", "principle 3"],
  "examples": [
    {
      "description": "example description",
      "code": "optional code snippet"
    }
  ],
  "existingVisualizations": [
    {
      "type": "visualization type",
      "url": "https://example.com",
      "quality": 0.8
    }
  ],
  "references": ["source 1", "source 2"]
}

Be thorough but concise.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      toolCalls += 1;
      tokensUsed += response.usage.input_tokens + response.usage.output_tokens;

      const text = response.content[0].type === 'text'
        ? response.content[0].text
        : '{}';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const researchData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      // Build findings
      const findings: ResearchFindings = {
        conceptId: concept.id,
        summary: researchData.summary || `Research findings for ${concept.input}`,
        keyPrinciples: researchData.keyPrinciples || [],
        examples: researchData.examples || [],
        existingVisualizations: researchData.existingVisualizations || [],
        references: researchData.references || [],
        compressed: false,
      };

      console.log(`[ResearchAgent] Research complete: ${findings.keyPrinciples.length} principles found`);

      return {
        success: true,
        data: findings,
        metadata: {
          toolCalls,
          tokensUsed,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('[ResearchAgent] Research failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolCalls,
          tokensUsed,
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Compress research findings to reduce memory usage
   */
  async compress(findings: ResearchFindings): Promise<ResearchFindings> {
    if (findings.compressed) return findings;

    try {
      const prompt = `Compress these research findings while preserving key information:

Summary: ${findings.summary}
Principles: ${findings.keyPrinciples.join(', ')}
Examples: ${findings.examples.length} examples
References: ${findings.references.length} references

Provide compressed version in same JSON format but more concise.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text'
        ? response.content[0].text
        : '{}';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const compressed = jsonMatch ? JSON.parse(jsonMatch[0]) : findings;

      return {
        ...compressed,
        conceptId: findings.conceptId,
        compressed: true,
      };
    } catch {
      // Fallback: simple truncation
      return {
        ...findings,
        summary: findings.summary.slice(0, 200),
        examples: findings.examples.slice(0, 2),
        compressed: true,
      };
    }
  }
}
