/**
 * Visualization Agent - Code generation and rendering subagent
 *
 * Responsibilities:
 * - Generate visualization code based on strategy
 * - Render and execute visualizations
 * - Handle multiple output formats
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Concept,
  ResearchFindings,
  VisualizationStrategy,
  VisualizationOutput,
  SubagentResponse,
} from '../../types/index.js';
import * as fs from 'fs';
import * as path from 'path';

export class VisualizationAgent {
  private client: Anthropic;
  private model: string;
  private outputDir: string;

  constructor(
    client: Anthropic,
    model: string = 'claude-sonnet-4-5-20250929',
    outputDir: string = './output'
  ) {
    this.client = client;
    this.model = model;
    this.outputDir = outputDir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Generate visualization based on concept, research, and strategy
   */
  async generate(
    concept: Concept,
    research: ResearchFindings,
    strategy: VisualizationStrategy
  ): Promise<SubagentResponse<VisualizationOutput[]>> {
    console.log('[VisualizationAgent] Generating visualization:', strategy.primaryType);

    const startTime = Date.now();
    let toolCalls = 0;
    let tokensUsed = 0;

    try {
      const visualizations: VisualizationOutput[] = [];

      // Generate primary visualization
      const primaryViz = await this.generateVisualization(
        concept,
        research,
        strategy.primaryType,
        'primary'
      );

      if (primaryViz) {
        visualizations.push(primaryViz);
        toolCalls += 1;
        tokensUsed += 1500; // Estimate
      }

      // Generate secondary visualizations for complex concepts
      if (strategy.multiPanel && strategy.secondaryTypes.length > 0) {
        for (const secType of strategy.secondaryTypes.slice(0, 2)) {
          const secViz = await this.generateVisualization(
            concept,
            research,
            secType,
            'secondary'
          );

          if (secViz) {
            visualizations.push(secViz);
            toolCalls += 1;
            tokensUsed += 1000;
          }
        }
      }

      console.log(`[VisualizationAgent] Generated ${visualizations.length} visualizations`);

      return {
        success: true,
        data: visualizations,
        metadata: {
          toolCalls,
          tokensUsed,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('[VisualizationAgent] Generation failed:', error);

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
   * Generate a single visualization
   */
  private async generateVisualization(
    concept: Concept,
    research: ResearchFindings,
    vizType: string,
    variant: string
  ): Promise<VisualizationOutput | null> {
    try {
      const prompt = this.buildGenerationPrompt(concept, research, vizType);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const code = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Determine format based on viz type
      const format = this.getOutputFormat(vizType);

      // Save to file
      const filename = `${concept.id}_${variant}_${vizType.replace(/-/g, '_')}.${format}`;
      const filePath = path.join(this.outputDir, filename);

      fs.writeFileSync(filePath, code, 'utf-8');

      const output: VisualizationOutput = {
        id: this.generateId(),
        conceptId: concept.id,
        type: vizType as any,
        format: format as any,
        content: code,
        filePath,
        metadata: {
          generatedAt: Date.now(),
          libraries: this.getLibraries(vizType),
          linesOfCode: code.split('\n').length,
        },
        verification: {
          passed: false,
          rulesPassed: false,
          visualPassed: false,
          issues: [],
        },
      };

      console.log(`[VisualizationAgent] Created: ${filename} (${output.metadata.linesOfCode} lines)`);
      return output;
    } catch (error) {
      console.error('[VisualizationAgent] Failed to generate:', error);
      return null;
    }
  }

  /**
   * Build generation prompt based on visualization type
   */
  private buildGenerationPrompt(
    concept: Concept,
    research: ResearchFindings,
    vizType: string
  ): string {
    const basePrompt = `Create a visualization for: "${concept.input}"

Summary: ${research.summary}

Key Principles:
${research.keyPrinciples.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Visualization Type: ${vizType}
`;

    switch (vizType) {
      case 'd3-interactive':
        return `${basePrompt}

Create an interactive HTML visualization using D3.js.
Requirements:
- Complete HTML file with embedded CSS and JavaScript
- Interactive elements (hover, click, drag if appropriate)
- Clear labels and annotations
- Responsive design
- Use modern D3.js v7 syntax

Return only the complete HTML code.`;

      case 'mermaid-diagram':
        return `${basePrompt}

Create a Mermaid diagram.
Requirements:
- Use appropriate diagram type (flowchart, sequence, class, etc.)
- Clear, logical structure
- Proper labeling
- Good visual hierarchy

Return complete HTML with embedded Mermaid code:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
  <div class="mermaid">
    [Your Mermaid diagram here]
  </div>
  <script>mermaid.initialize({ startOnLoad: true });</script>
</body>
</html>
\`\`\``;

      case 'plotly-chart':
        return `${basePrompt}

Create an interactive chart using Plotly.
Requirements:
- Complete HTML file with Plotly.js
- Appropriate chart type for the data/concept
- Interactive controls if applicable
- Clear axis labels and title

Return only the complete HTML code.`;

      case 'manim-animation':
        return `${basePrompt}

Create a Manim Python script for animation.
Requirements:
- Clear, step-by-step animation
- Proper scene setup
- Good pacing
- Educational annotations

Return only the Python code.`;

      case 'threejs-3d':
        return `${basePrompt}

Create a 3D visualization using Three.js.
Requirements:
- Complete HTML file with Three.js
- Camera controls for exploration
- Proper lighting
- Clear 3D representation

Return only the complete HTML code.`;

      default:
        return `${basePrompt}\n\nCreate an appropriate visualization in HTML format.`;
    }
  }

  /**
   * Get output format for visualization type
   */
  private getOutputFormat(vizType: string): string {
    if (vizType === 'manim-animation') return 'py';
    return 'html';
  }

  /**
   * Get libraries used for visualization type
   */
  private getLibraries(vizType: string): string[] {
    const libraryMap: Record<string, string[]> = {
      'd3-interactive': ['d3.js'],
      'mermaid-diagram': ['mermaid'],
      'plotly-chart': ['plotly.js'],
      'manim-animation': ['manim'],
      'threejs-3d': ['three.js'],
    };

    return libraryMap[vizType] || ['html'];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
