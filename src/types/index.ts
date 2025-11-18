/**
 * Core type definitions for Concept Visualizer Agent
 * Based on 2025 autonomous agent research (MemAct, HiAgent, ReAct)
 */

export type ConceptType =
  | 'algorithm'
  | 'data-structure'
  | 'system-architecture'
  | 'mathematical'
  | 'process-flow'
  | 'scientific'
  | 'business'
  | 'general';

export type ComplexityLevel = 'simple' | 'medium' | 'complex' | 'expert';

export type VisualizationType =
  | 'd3-interactive'
  | 'mermaid-diagram'
  | 'manim-animation'
  | 'plotly-chart'
  | 'threejs-3d'
  | 'static-svg'
  | 'html-interactive';

export interface Concept {
  id: string;
  input: string;
  type: ConceptType;
  complexity: ComplexityLevel;
  domain: string;
  keywords: string[];
  relatedConcepts: string[];
}

export interface TaskNode {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  subtasks: TaskNode[];
  result?: any;
  metadata: {
    startTime?: number;
    endTime?: number;
    toolCallsUsed: number;
    tokensUsed: number;
  };
}

/**
 * Hierarchical Task Plan
 * Implements decomposition strategy from HiAgent research
 */
export interface TaskPlan {
  concept: Concept;
  rootTask: TaskNode;
  totalEstimatedToolCalls: number;
  estimatedComplexity: ComplexityLevel;
  checkpointStrategy: 'none' | 'milestone' | 'frequent';
}

/**
 * Memory Management (MemAct-inspired)
 * Decisions: retain, compress, discard
 */
export interface MemorySegment {
  id: string;
  content: string;
  type: 'context' | 'decision' | 'output' | 'error';
  importance: number; // 0-1 score
  timestamp: number;
  action: 'retain' | 'compress' | 'discard';
  compressed?: string;
}

export interface WorkingMemory {
  immediate: MemorySegment[];      // Current context (high importance)
  compressed: MemorySegment[];     // Summarized past context
  archived: MemorySegment[];       // Stored for potential retrieval
  maxImmediateSize: number;        // Token limit for immediate memory
  compressionThreshold: number;    // When to compress (e.g., 0.7)
}

/**
 * Research findings from research subagent
 */
export interface ResearchFindings {
  conceptId: string;
  summary: string;
  keyPrinciples: string[];
  examples: Array<{
    description: string;
    url?: string;
    code?: string;
  }>;
  existingVisualizations: Array<{
    type: string;
    url: string;
    quality: number;
  }>;
  references: string[];
  compressed: boolean; // Whether findings have been compressed
}

/**
 * Visualization strategy
 */
export interface VisualizationStrategy {
  conceptId: string;
  primaryType: VisualizationType;
  secondaryTypes: VisualizationType[];
  interactionModel: 'static' | 'interactive' | 'animated' | 'mixed';
  progressiveDisclosure: boolean; // Start simple, add detail
  multiPanel: boolean;
  libraries: string[];
  estimatedGenerationTime: number;
  verificationCriteria: VerificationCriteria;
}

export interface VerificationCriteria {
  ruleBased: {
    codeExecutes: boolean;
    noErrors: boolean;
    outputGenerated: boolean;
  };
  visual: {
    requireScreenshot: boolean;
    minDimensions?: { width: number; height: number };
  };
  llmJudge: {
    enabled: boolean;
    criteria: string[];
    minScore: number;
  };
}

/**
 * Generated visualization output
 */
export interface VisualizationOutput {
  id: string;
  conceptId: string;
  type: VisualizationType;
  format: 'html' | 'svg' | 'png' | 'mp4' | 'jupyter';
  content: string | Buffer;
  filePath: string;
  metadata: {
    generatedAt: number;
    libraries: string[];
    linesOfCode: number;
  };
  verification: {
    passed: boolean;
    rulesPassed: boolean;
    visualPassed: boolean;
    llmScore?: number;
    issues: string[];
  };
}

/**
 * Explanation accompanying visualization
 */
export interface Explanation {
  conceptId: string;
  overview: string;
  sections: Array<{
    title: string;
    content: string;
    visualizationRef?: string; // Reference to viz ID
  }>;
  annotations: Array<{
    visualizationId: string;
    position: { x: number; y: number } | string;
    text: string;
  }>;
  interactiveGuide?: {
    steps: Array<{
      instruction: string;
      action: string;
      expectedResult: string;
    }>;
  };
}

/**
 * Complete agent response
 */
export interface ConceptVisualizationResult {
  concept: Concept;
  visualizations: VisualizationOutput[];
  explanations: Explanation;
  metadata: {
    totalTime: number;
    toolCalls: number;
    tokensUsed: number;
    checkpointsUsed: number;
  };
  success: boolean;
  errors: string[];
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  model: string;
  apiKey: string;
  maxContextLength?: number;
  enableCheckpoints?: boolean;
  checkpointInterval?: number; // Tool calls between checkpoints
  parallelSubagents?: boolean;
  verificationLevel?: 'basic' | 'standard' | 'strict';
  outputDirectory?: string;
}

/**
 * Subagent response format
 */
export interface SubagentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    toolCalls: number;
    tokensUsed: number;
    duration: number;
  };
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolName: string;
  input: any;
  output: any;
  success: boolean;
  error?: string;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
  };
}

/**
 * Checkpoint for long-horizon tasks
 */
export interface Checkpoint {
  id: string;
  timestamp: number;
  taskPlan: TaskPlan;
  completedTasks: string[];
  workingMemory: WorkingMemory;
  partialResults: {
    research?: ResearchFindings;
    strategy?: VisualizationStrategy;
    outputs?: VisualizationOutput[];
  };
  canResume: boolean;
}

/**
 * Plugin interface for extensibility
 */
export interface VisualizationPlugin {
  name: string;
  version: string;
  supportedConcepts: ConceptType[];
  generate(concept: Concept, research: ResearchFindings): Promise<VisualizationOutput>;
  verify(output: VisualizationOutput): Promise<boolean>;
  metadata: {
    author: string;
    description: string;
    dependencies: string[];
  };
}

/**
 * ReAct loop state
 */
export interface ReActState {
  thought: string;
  action: {
    tool: string;
    input: any;
  };
  observation: string;
  iteration: number;
  shouldContinue: boolean;
}

/**
 * Agent performance metrics
 */
export interface PerformanceMetrics {
  conceptsProcessed: number;
  averageTime: number;
  successRate: number;
  averageToolCalls: number;
  averageTokens: number;
  verificationPassRate: number;
  byConceptType: Map<ConceptType, {
    count: number;
    avgTime: number;
    successRate: number;
  }>;
}
