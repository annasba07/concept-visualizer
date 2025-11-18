/**
 * Task Planner - Hierarchical decomposition for long-horizon tasks
 *
 * Implements hierarchical working memory management inspired by HiAgent
 * Breaks down complex concept visualization into manageable subtasks
 *
 * Based on HiAgent (ACL 2025) research on hierarchical working memory
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Concept,
  ConceptType,
  ComplexityLevel,
  TaskNode,
  TaskPlan,
} from '../../types/index.js';

export class TaskPlanner {
  private client: Anthropic;
  private model: string;

  constructor(client: Anthropic, model: string = 'claude-sonnet-4-5-20250929') {
    this.client = client;
    this.model = model;
  }

  /**
   * Analyze concept and create hierarchical task plan
   */
  async planTasks(conceptInput: string): Promise<TaskPlan> {
    console.log('[TaskPlanner] Analyzing concept and creating task plan...');

    // Step 1: Analyze the concept
    const concept = await this.analyzeConcept(conceptInput);

    // Step 2: Create hierarchical task decomposition
    const rootTask = await this.decompose(concept);

    // Step 3: Estimate complexity and checkpoint strategy
    const totalEstimatedToolCalls = this.estimateToolCalls(rootTask);
    const checkpointStrategy = this.determineCheckpointStrategy(
      concept.complexity,
      totalEstimatedToolCalls
    );

    const plan: TaskPlan = {
      concept,
      rootTask,
      totalEstimatedToolCalls,
      estimatedComplexity: concept.complexity,
      checkpointStrategy,
    };

    console.log(`[TaskPlanner] Plan created: ${this.countTasks(rootTask)} tasks, ~${totalEstimatedToolCalls} tool calls`);
    return plan;
  }

  /**
   * Analyze and classify the input concept
   */
  private async analyzeConcept(input: string): Promise<Concept> {
    const prompt = `Analyze this concept request and extract structured information:

INPUT: "${input}"

Provide analysis in this exact JSON format:
{
  "type": "algorithm|data-structure|system-architecture|mathematical|process-flow|scientific|business|general",
  "complexity": "simple|medium|complex|expert",
  "domain": "brief domain name",
  "keywords": ["key", "terms"],
  "relatedConcepts": ["related", "concepts"]
}

Be concise and accurate.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text'
        ? response.content[0].text
        : '{}';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        id: this.generateId(),
        input,
        type: analysis.type || 'general',
        complexity: analysis.complexity || 'medium',
        domain: analysis.domain || 'general',
        keywords: analysis.keywords || [],
        relatedConcepts: analysis.relatedConcepts || [],
      };
    } catch (error) {
      console.warn('[TaskPlanner] Analysis failed, using defaults:', error);
      return {
        id: this.generateId(),
        input,
        type: 'general',
        complexity: 'medium',
        domain: 'general',
        keywords: [],
        relatedConcepts: [],
      };
    }
  }

  /**
   * Hierarchical task decomposition
   */
  private async decompose(concept: Concept): Promise<TaskNode> {
    const rootTask: TaskNode = {
      id: 'root',
      description: `Visualize: ${concept.input}`,
      status: 'pending',
      dependencies: [],
      subtasks: [],
      metadata: {
        toolCallsUsed: 0,
        tokensUsed: 0,
      },
    };

    // Level 1: Main phases (always present)
    const phases = this.createMainPhases(concept);
    rootTask.subtasks = phases;

    // Level 2: Decompose each phase based on complexity
    for (const phase of phases) {
      if (concept.complexity === 'complex' || concept.complexity === 'expert') {
        phase.subtasks = await this.decomposePhase(phase, concept);
      }
    }

    return rootTask;
  }

  /**
   * Create main phases of visualization process
   */
  private createMainPhases(concept: Concept): TaskNode[] {
    const phases: TaskNode[] = [
      {
        id: 'phase_1_research',
        description: 'Research and gather context about the concept',
        status: 'pending',
        dependencies: [],
        subtasks: [],
        metadata: { toolCallsUsed: 0, tokensUsed: 0 },
      },
      {
        id: 'phase_2_strategy',
        description: 'Design visualization strategy',
        status: 'pending',
        dependencies: ['phase_1_research'],
        subtasks: [],
        metadata: { toolCallsUsed: 0, tokensUsed: 0 },
      },
      {
        id: 'phase_3_generate',
        description: 'Generate visualization code and assets',
        status: 'pending',
        dependencies: ['phase_2_strategy'],
        subtasks: [],
        metadata: { toolCallsUsed: 0, tokensUsed: 0 },
      },
      {
        id: 'phase_4_verify',
        description: 'Verify and validate outputs',
        status: 'pending',
        dependencies: ['phase_3_generate'],
        subtasks: [],
        metadata: { toolCallsUsed: 0, tokensUsed: 0 },
      },
    ];

    // Add refinement phase for complex concepts
    if (concept.complexity === 'complex' || concept.complexity === 'expert') {
      phases.push({
        id: 'phase_5_refine',
        description: 'Refine and enhance visualization',
        status: 'pending',
        dependencies: ['phase_4_verify'],
        subtasks: [],
        metadata: { toolCallsUsed: 0, tokensUsed: 0 },
      });
    }

    return phases;
  }

  /**
   * Decompose a phase into subtasks
   */
  private async decomposePhase(phase: TaskNode, concept: Concept): Promise<TaskNode[]> {
    // Detailed decomposition based on phase type
    switch (phase.id) {
      case 'phase_1_research':
        return [
          this.createTask('research_web', 'Search web for concept explanations', []),
          this.createTask('research_examples', 'Find existing visualizations', ['research_web']),
          this.createTask('research_compress', 'Compress findings', ['research_web', 'research_examples']),
        ];

      case 'phase_2_strategy':
        return [
          this.createTask('strategy_select_type', 'Select visualization types', []),
          this.createTask('strategy_choose_libs', 'Choose libraries and tools', ['strategy_select_type']),
          this.createTask('strategy_interaction', 'Design interaction model', ['strategy_select_type']),
        ];

      case 'phase_3_generate':
        const subtasks = [
          this.createTask('generate_scaffold', 'Create basic structure', []),
          this.createTask('generate_core', 'Implement core visualization', ['generate_scaffold']),
        ];

        if (concept.complexity === 'expert') {
          subtasks.push(
            this.createTask('generate_interactive', 'Add interactivity', ['generate_core']),
            this.createTask('generate_annotate', 'Add annotations', ['generate_interactive'])
          );
        }

        return subtasks;

      case 'phase_4_verify':
        return [
          this.createTask('verify_execute', 'Execute code and check errors', []),
          this.createTask('verify_visual', 'Visual validation', ['verify_execute']),
          this.createTask('verify_llm', 'LLM quality assessment', ['verify_visual']),
        ];

      case 'phase_5_refine':
        return [
          this.createTask('refine_clarity', 'Improve visual clarity', []),
          this.createTask('refine_performance', 'Optimize performance', ['refine_clarity']),
        ];

      default:
        return [];
    }
  }

  /**
   * Estimate total tool calls for task tree
   */
  private estimateToolCalls(task: TaskNode): number {
    let estimate = 0;

    // Estimate based on task type
    if (task.id.includes('research')) estimate = 5;
    else if (task.id.includes('generate')) estimate = 10;
    else if (task.id.includes('verify')) estimate = 3;
    else if (task.id.includes('strategy')) estimate = 2;
    else estimate = 1;

    // Add estimates from subtasks
    for (const subtask of task.subtasks) {
      estimate += this.estimateToolCalls(subtask);
    }

    return estimate;
  }

  /**
   * Determine checkpoint strategy based on complexity
   */
  private determineCheckpointStrategy(
    complexity: ComplexityLevel,
    toolCalls: number
  ): 'none' | 'milestone' | 'frequent' {
    if (toolCalls > 300 || complexity === 'expert') return 'frequent';
    if (toolCalls > 100 || complexity === 'complex') return 'milestone';
    return 'none';
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    plan: TaskPlan,
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    result?: any
  ): void {
    const task = this.findTask(plan.rootTask, taskId);
    if (task) {
      task.status = status;
      if (result !== undefined) {
        task.result = result;
      }
      if (status === 'in_progress') {
        task.metadata.startTime = Date.now();
      } else if (status === 'completed' || status === 'failed') {
        task.metadata.endTime = Date.now();
      }
    }
  }

  /**
   * Get next executable tasks (dependencies met)
   */
  getNextTasks(plan: TaskPlan): TaskNode[] {
    const nextTasks: TaskNode[] = [];

    const traverse = (task: TaskNode) => {
      if (task.status === 'pending') {
        // Check if all dependencies are completed
        const dependenciesMet = task.dependencies.every(depId => {
          const depTask = this.findTask(plan.rootTask, depId);
          return depTask && depTask.status === 'completed';
        });

        if (dependenciesMet) {
          // Check if task has subtasks
          if (task.subtasks.length === 0) {
            nextTasks.push(task);
          } else {
            // If has subtasks, traverse them
            task.subtasks.forEach(traverse);
          }
        }
      } else if (task.status === 'in_progress' && task.subtasks.length > 0) {
        // If task is in progress, check its subtasks
        task.subtasks.forEach(traverse);
      }
    };

    plan.rootTask.subtasks.forEach(traverse);
    return nextTasks;
  }

  /**
   * Check if plan is complete
   */
  isPlanComplete(plan: TaskPlan): boolean {
    return this.isTaskComplete(plan.rootTask);
  }

  /**
   * Get plan progress percentage
   */
  getProgress(plan: TaskPlan): number {
    const total = this.countTasks(plan.rootTask);
    const completed = this.countCompletedTasks(plan.rootTask);
    return total > 0 ? (completed / total) * 100 : 0;
  }

  // Utility methods

  private createTask(
    id: string,
    description: string,
    dependencies: string[]
  ): TaskNode {
    return {
      id,
      description,
      status: 'pending',
      dependencies,
      subtasks: [],
      metadata: {
        toolCallsUsed: 0,
        tokensUsed: 0,
      },
    };
  }

  private findTask(root: TaskNode, taskId: string): TaskNode | null {
    if (root.id === taskId) return root;

    for (const subtask of root.subtasks) {
      const found = this.findTask(subtask, taskId);
      if (found) return found;
    }

    return null;
  }

  private isTaskComplete(task: TaskNode): boolean {
    if (task.subtasks.length === 0) {
      return task.status === 'completed';
    }
    return task.subtasks.every(st => this.isTaskComplete(st));
  }

  private countTasks(task: TaskNode): number {
    let count = task.subtasks.length === 0 ? 1 : 0;
    for (const subtask of task.subtasks) {
      count += this.countTasks(subtask);
    }
    return count;
  }

  private countCompletedTasks(task: TaskNode): number {
    let count = task.subtasks.length === 0 && task.status === 'completed' ? 1 : 0;
    for (const subtask of task.subtasks) {
      count += this.countCompletedTasks(subtask);
    }
    return count;
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
