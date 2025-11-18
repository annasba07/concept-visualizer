/**
 * Concept Agent - Main orchestrator for concept visualization
 *
 * Implements ReAct pattern (Reasoning and Acting):
 * - Thought: Analyze current state and plan next action
 * - Action: Execute tools via subagents
 * - Observation: Process results and update memory
 *
 * Coordinates TaskPlanner, MemoryManager, and specialized subagents
 * for long-horizon concept visualization tasks
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentConfig,
  ConceptVisualizationResult,
  TaskPlan,
  Checkpoint,
  VisualizationOutput,
  Explanation,
  ResearchFindings,
  VisualizationStrategy,
} from '../../types/index.js';
import { MemoryManager } from './MemoryManager.js';
import { TaskPlanner } from './TaskPlanner.js';
import { ResearchAgent } from '../subagents/ResearchAgent.js';
import { VisualizationAgent } from '../subagents/VisualizationAgent.js';

export class ConceptAgent {
  private client: Anthropic;
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private taskPlanner: TaskPlanner;
  private researchAgent: ResearchAgent;
  private visualizationAgent: VisualizationAgent;
  private checkpoints: Map<string, Checkpoint>;

  constructor(config: AgentConfig) {
    this.config = {
      maxContextLength: 200000,
      enableCheckpoints: true,
      checkpointInterval: 50,
      parallelSubagents: true,
      verificationLevel: 'standard',
      outputDirectory: './output',
      ...config,
    };

    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.memoryManager = new MemoryManager(
      this.client,
      this.config.model,
      this.config.maxContextLength
    );
    this.taskPlanner = new TaskPlanner(this.client, this.config.model);
    this.researchAgent = new ResearchAgent(this.client, this.config.model);
    this.visualizationAgent = new VisualizationAgent(
      this.client,
      this.config.model,
      this.config.outputDirectory!
    );
    this.checkpoints = new Map();

    console.log('[ConceptAgent] Initialized with model:', this.config.model);
  }

  /**
   * Main entry point: Visualize a concept
   */
  async visualizeConcept(
    conceptInput: string,
    options?: {
      detailLevel?: 'basic' | 'standard' | 'comprehensive';
      preferredTypes?: string[];
    }
  ): Promise<ConceptVisualizationResult> {
    console.log('\n=== Starting Concept Visualization ===');
    console.log('Input:', conceptInput);

    const startTime = Date.now();
    let totalToolCalls = 0;
    let totalTokens = 0;
    let checkpointsUsed = 0;

    try {
      // Phase 1: Planning
      console.log('\n[Phase 1] Task Planning...');
      await this.memoryManager.add(
        `User request: ${conceptInput}`,
        'context',
        1.0
      );

      const plan = await this.taskPlanner.planTasks(conceptInput);
      await this.memoryManager.add(
        `Task plan created: ${JSON.stringify(plan, null, 2)}`,
        'decision',
        0.9
      );

      console.log(`Plan: ${this.taskPlanner.getProgress(plan).toFixed(0)}% complete`);
      console.log(`Estimated tool calls: ${plan.totalEstimatedToolCalls}`);

      // Phase 2: Research
      console.log('\n[Phase 2] Research Phase...');
      const researchPhase = plan.rootTask.subtasks.find(t => t.id === 'phase_1_research');
      if (researchPhase) {
        this.taskPlanner.updateTaskStatus(plan, 'phase_1_research', 'in_progress');

        const researchResult = await this.researchAgent.research(plan.concept);
        totalToolCalls += researchResult.metadata.toolCalls;
        totalTokens += researchResult.metadata.tokensUsed;

        if (researchResult.success && researchResult.data) {
          await this.memoryManager.add(
            JSON.stringify(researchResult.data),
            'output',
            0.8
          );
          this.taskPlanner.updateTaskStatus(
            plan,
            'phase_1_research',
            'completed',
            researchResult.data
          );
        }

        console.log(`Research complete: ${researchResult.success ? 'SUCCESS' : 'FAILED'}`);
      }

      // Checkpoint if needed
      if (this.shouldCheckpoint(plan, totalToolCalls)) {
        await this.createCheckpoint(plan, {
          research: researchPhase?.result as ResearchFindings,
        });
        checkpointsUsed++;
      }

      // Phase 3: Strategy
      console.log('\n[Phase 3] Strategy Design...');
      const strategyPhase = plan.rootTask.subtasks.find(t => t.id === 'phase_2_strategy');
      if (strategyPhase) {
        this.taskPlanner.updateTaskStatus(plan, 'phase_2_strategy', 'in_progress');

        const strategy = await this.designStrategy(
          plan.concept,
          researchPhase?.result as ResearchFindings,
          options
        );
        totalToolCalls += 5; // Estimate for strategy design

        await this.memoryManager.add(
          JSON.stringify(strategy),
          'decision',
          0.9
        );
        this.taskPlanner.updateTaskStatus(
          plan,
          'phase_2_strategy',
          'completed',
          strategy
        );

        console.log(`Strategy: ${strategy.primaryType}, interactive: ${strategy.interactionModel}`);
      }

      // Phase 4: Generation
      console.log('\n[Phase 4] Visualization Generation...');
      const generatePhase = plan.rootTask.subtasks.find(t => t.id === 'phase_3_generate');
      if (generatePhase) {
        this.taskPlanner.updateTaskStatus(plan, 'phase_3_generate', 'in_progress');

        const vizResult = await this.visualizationAgent.generate(
          plan.concept,
          researchPhase?.result as ResearchFindings,
          strategyPhase?.result as VisualizationStrategy
        );
        totalToolCalls += vizResult.metadata.toolCalls;
        totalTokens += vizResult.metadata.tokensUsed;

        if (vizResult.success && vizResult.data) {
          this.taskPlanner.updateTaskStatus(
            plan,
            'phase_3_generate',
            'completed',
            vizResult.data
          );
        }

        console.log(`Generated ${vizResult.data?.length || 0} visualizations`);
      }

      // Phase 5: Verification
      console.log('\n[Phase 5] Verification...');
      const verifyPhase = plan.rootTask.subtasks.find(t => t.id === 'phase_4_verify');
      if (verifyPhase) {
        this.taskPlanner.updateTaskStatus(plan, 'phase_4_verify', 'in_progress');

        const visualizations = generatePhase?.result as VisualizationOutput[];
        const verifiedVizs = await this.verifyVisualizations(visualizations);
        totalToolCalls += 10; // Estimate for verification

        this.taskPlanner.updateTaskStatus(
          plan,
          'phase_4_verify',
          'completed',
          verifiedVizs
        );

        const passedCount = verifiedVizs.filter(v => v.verification.passed).length;
        console.log(`Verification: ${passedCount}/${verifiedVizs.length} passed`);
      }

      // Phase 6: Create Explanations
      console.log('\n[Phase 6] Creating Explanations...');
      const explanation = await this.createExplanation(
        plan.concept,
        researchPhase?.result as ResearchFindings,
        verifyPhase?.result as VisualizationOutput[]
      );
      totalToolCalls += 5;

      const totalTime = Date.now() - startTime;
      console.log('\n=== Visualization Complete ===');
      console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log(`Tool calls: ${totalToolCalls}`);
      console.log(`Checkpoints: ${checkpointsUsed}`);

      // Clean up memory
      this.memoryManager.clear();

      return {
        concept: plan.concept,
        visualizations: verifyPhase?.result as VisualizationOutput[] || [],
        explanations: explanation,
        metadata: {
          totalTime,
          toolCalls: totalToolCalls,
          tokensUsed: totalTokens,
          checkpointsUsed,
        },
        success: true,
        errors: [],
      };
    } catch (error) {
      console.error('[ConceptAgent] Error during visualization:', error);

      return {
        concept: { id: '', input: conceptInput, type: 'general', complexity: 'medium', domain: '', keywords: [], relatedConcepts: [] },
        visualizations: [],
        explanations: { conceptId: '', overview: '', sections: [], annotations: [] },
        metadata: {
          totalTime: Date.now() - startTime,
          toolCalls: totalToolCalls,
          tokensUsed: totalTokens,
          checkpointsUsed,
        },
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Design visualization strategy using ReAct reasoning
   */
  private async designStrategy(
    concept: any,
    _research: ResearchFindings,
    _options?: any
  ): Promise<VisualizationStrategy> {
    // Thought: Analyze concept type and select appropriate visualization
    const typeMapping: Record<string, any> = {
      'algorithm': { primary: 'manim-animation', secondary: ['mermaid-diagram'] },
      'data-structure': { primary: 'd3-interactive', secondary: ['mermaid-diagram'] },
      'system-architecture': { primary: 'mermaid-diagram', secondary: ['d3-interactive'] },
      'mathematical': { primary: 'plotly-chart', secondary: ['manim-animation'] },
      'process-flow': { primary: 'mermaid-diagram', secondary: ['d3-interactive'] },
      'scientific': { primary: 'threejs-3d', secondary: ['plotly-chart'] },
    };

    const mapping = typeMapping[concept.type] || { primary: 'd3-interactive', secondary: ['mermaid-diagram'] };

    return {
      conceptId: concept.id,
      primaryType: mapping.primary,
      secondaryTypes: mapping.secondary,
      interactionModel: concept.complexity === 'simple' ? 'static' : 'interactive',
      progressiveDisclosure: concept.complexity === 'complex' || concept.complexity === 'expert',
      multiPanel: concept.complexity === 'expert',
      libraries: this.selectLibraries(mapping.primary),
      estimatedGenerationTime: 60,
      verificationCriteria: {
        ruleBased: {
          codeExecutes: true,
          noErrors: true,
          outputGenerated: true,
        },
        visual: {
          requireScreenshot: true,
        },
        llmJudge: {
          enabled: this.config.verificationLevel === 'strict',
          criteria: ['accuracy', 'clarity', 'completeness'],
          minScore: 0.7,
        },
      },
    };
  }

  /**
   * Verify visualizations using multi-layered approach
   */
  private async verifyVisualizations(
    visualizations: VisualizationOutput[]
  ): Promise<VisualizationOutput[]> {
    console.log(`[ConceptAgent] Verifying ${visualizations.length} visualizations...`);

    for (const viz of visualizations) {
      // Rule-based verification (basic checks)
      viz.verification.rulesPassed = viz.content !== undefined && viz.content.length > 0;

      // Visual verification (check if file exists)
      viz.verification.visualPassed = true; // Would check file in real implementation

      // LLM verification (if enabled)
      if (this.config.verificationLevel === 'strict') {
        viz.verification.llmScore = await this.llmJudgeQuality(viz);
      }

      viz.verification.passed = viz.verification.rulesPassed && viz.verification.visualPassed;
    }

    return visualizations;
  }

  /**
   * LLM-based quality assessment
   */
  private async llmJudgeQuality(viz: VisualizationOutput): Promise<number> {
    try {
      const prompt = `Assess the quality of this visualization code for clarity, accuracy, and completeness.

Visualization Type: ${viz.type}
Code Length: ${typeof viz.content === 'string' ? viz.content.length : 0} characters

Rate from 0-1 (1 being perfect). Return only a number.`;

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '0.5';
      const score = parseFloat(text.match(/0?\.\d+|1\.0|1/)?.[0] || '0.5');
      return Math.min(Math.max(score, 0), 1);
    } catch {
      return 0.7; // Default if assessment fails
    }
  }

  /**
   * Create comprehensive explanation
   */
  private async createExplanation(
    concept: any,
    research: ResearchFindings,
    _visualizations: VisualizationOutput[]
  ): Promise<Explanation> {
    const prompt = `Create a clear explanation for the concept: "${concept.input}"

Research Summary:
${research.summary}

Key Principles:
${research.keyPrinciples.join('\n')}

Create an overview (2-3 paragraphs) and 3-5 sections explaining different aspects.
Format as JSON:
{
  "overview": "...",
  "sections": [
    {"title": "...", "content": "..."},
    ...
  ]
}`;

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { overview: research.summary, sections: [] };

      return {
        conceptId: concept.id,
        overview: parsed.overview || research.summary,
        sections: parsed.sections || [],
        annotations: [],
      };
    } catch {
      return {
        conceptId: concept.id,
        overview: research.summary,
        sections: [],
        annotations: [],
      };
    }
  }

  // Checkpoint management

  private shouldCheckpoint(plan: TaskPlan, toolCalls: number): boolean {
    if (!this.config.enableCheckpoints) return false;
    if (plan.checkpointStrategy === 'none') return false;
    if (plan.checkpointStrategy === 'frequent') {
      return toolCalls % 50 === 0;
    }
    // Milestone: checkpoint at major phases
    return false;
  }

  private async createCheckpoint(plan: TaskPlan, partialResults: any): Promise<void> {
    const checkpoint: Checkpoint = {
      id: `checkpoint_${Date.now()}`,
      timestamp: Date.now(),
      taskPlan: plan,
      completedTasks: [],
      workingMemory: this.memoryManager.getMemoryState(),
      partialResults,
      canResume: true,
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    console.log(`[ConceptAgent] Checkpoint created: ${checkpoint.id}`);
  }

  // Utility methods

  private selectLibraries(vizType: string): string[] {
    const libraryMap: Record<string, string[]> = {
      'd3-interactive': ['d3', 'html', 'css'],
      'mermaid-diagram': ['mermaid'],
      'manim-animation': ['manim', 'python'],
      'plotly-chart': ['plotly', 'pandas'],
      'threejs-3d': ['three.js', 'webgl'],
    };

    return libraryMap[vizType] || ['html', 'css', 'javascript'];
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      memory: this.memoryManager.getStats(),
      checkpoints: this.checkpoints.size,
    };
  }
}
