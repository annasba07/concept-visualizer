# Concept Visualizer Agent Architecture

## Overview
An autonomous agent built on Claude Agent SDK that creates sophisticated visualizations to explain any concept using long-horizon planning and multi-modal output generation.

## Core Design Principles

### 1. Long-Horizon Task Management
Based on MemAct and HiAgent research:
- **Hierarchical Memory**: Split working memory into immediate context, compressed summaries, and archived decisions
- **Context Curation**: Actively decide what to retain/compress/discard as context grows
- **Checkpoint System**: Save progress at key milestones for complex visualizations

### 2. ReAct-Based Planning Loop
```
Thought: Analyze concept and plan visualization approach
Action: Research concept, gather examples, generate code
Observation: Verify output quality, iterate if needed
```

### 3. Multi-Modal Visualization Stack
Support multiple visualization paradigms:
- **Interactive Web**: D3.js, Three.js, P5.js for dynamic visualizations
- **Static Diagrams**: Mermaid, GraphViz, PlantUML for architecture/flow
- **Data Visualizations**: Matplotlib, Plotly, Vega-Lite for charts
- **Code Animations**: Manim for mathematical/algorithmic concepts
- **3D Models**: Three.js, WebGL for spatial concepts

## Agent Architecture

### Layer 1: Task Planning & Decomposition
```typescript
ConceptAnalyzer
├── Parse input concept
├── Identify concept type (process/system/data/algorithm/theory)
├── Determine complexity level (simple/medium/complex)
└── Generate hierarchical task plan
```

**Capabilities:**
- Natural language concept parsing
- Domain classification (CS, Math, Physics, Business, etc.)
- Complexity assessment
- Sub-task generation for complex concepts

### Layer 2: Context Gathering & Research
```typescript
ResearchAgent (Subagent)
├── Web search for concept explanations
├── Find existing visualizations
├── Gather code examples
├── Extract key principles
└── Compress findings into structured knowledge
```

**Memory Management (MemAct-inspired):**
- Retain: Core principles, key formulas, essential patterns
- Compress: Long explanations into bullet points
- Discard: Redundant examples, off-topic tangents

### Layer 3: Visualization Strategy Selection
```typescript
VisualizationPlanner
├── Match concept type to visualization paradigm
├── Select appropriate libraries/tools
├── Design interaction model (static/interactive/animated)
├── Plan progressive disclosure for complex concepts
└── Define verification criteria
```

**Strategy Matrix:**
| Concept Type | Primary Viz | Secondary | Interactive |
|--------------|-------------|-----------|-------------|
| Algorithm | Manim animation | Flowchart | Step debugger |
| Data Structure | D3.js interactive | Mermaid diagram | Manipulation UI |
| System Architecture | Mermaid/C4 | Network graph | Drill-down |
| Mathematical | Manim/Desmos | LaTeX + plots | Parameter sliders |
| Process Flow | Swimlane diagram | State machine | Simulation |

### Layer 4: Code Generation & Execution
```typescript
VisualizationGenerator
├── Generate visualization code
├── Set up environment (install deps)
├── Execute and render
├── Capture output (HTML/PNG/SVG/MP4)
└── Handle errors and iterate
```

**Multi-Stage Generation:**
1. Scaffold: Create basic structure
2. Enhance: Add interactivity and styling
3. Annotate: Add explanatory text/tooltips
4. Optimize: Improve performance and clarity

### Layer 5: Verification & Iteration
```typescript
QualityAssurance
├── Rule-based: Check code runs, outputs generated
├── Visual: Screenshot/render validation
├── LLM Judge: Assess clarity, accuracy, completeness
└── User Feedback: Incorporate refinement requests
```

**Quality Criteria:**
- ✓ Visualization renders without errors
- ✓ Concept is accurately represented
- ✓ Visual clarity (not cluttered)
- ✓ Progressive complexity (simple → detailed)
- ✓ Interactive elements work correctly
- ✓ Explanatory text is clear

## Implementation Architecture

```
concept-visualizer/
├── src/
│   ├── agent/
│   │   ├── core/
│   │   │   ├── ConceptAgent.ts          # Main agent orchestrator
│   │   │   ├── TaskPlanner.ts           # Hierarchical task decomposition
│   │   │   └── MemoryManager.ts         # MemAct-inspired context curation
│   │   ├── subagents/
│   │   │   ├── ResearchAgent.ts         # Concept research subagent
│   │   │   ├── VisualizationAgent.ts    # Viz generation subagent
│   │   │   └── VerificationAgent.ts     # Quality checking subagent
│   │   └── tools/
│   │       ├── WebSearchTool.ts
│   │       ├── CodeExecutionTool.ts
│   │       ├── RenderTool.ts
│   │       └── MCPIntegrations.ts
│   ├── visualizers/
│   │   ├── d3/                          # D3.js templates
│   │   ├── mermaid/                     # Diagram templates
│   │   ├── manim/                       # Animation templates
│   │   ├── plotly/                      # Chart templates
│   │   └── threejs/                     # 3D templates
│   ├── utils/
│   │   ├── concept-parser.ts            # NLP for concept analysis
│   │   ├── template-engine.ts           # Dynamic code generation
│   │   └── renderer.ts                  # Multi-format rendering
│   └── types/
│       └── index.ts                     # TypeScript definitions
├── .claude/
│   ├── agents/
│   │   └── visualizer.md                # Agent system prompt
│   └── CLAUDE.md                        # Agent memory persistence
├── examples/                             # Example concepts & outputs
├── tests/
└── package.json
```

## Key Features

### 1. Adaptive Complexity
- **Simple Concepts**: Generate single, clear visualization
- **Medium Concepts**: Multi-panel or progressive disclosure
- **Complex Concepts**: Interactive exploration with hierarchical zoom

### 2. Multi-Format Output
- HTML files with embedded visualizations
- Standalone SVG/PNG for static diagrams
- MP4 animations for algorithmic concepts
- Interactive notebooks (Observable/Jupyter)

### 3. Explanation Integration
- Inline annotations in visualizations
- Sidebar explanatory text
- Tooltips on interactive elements
- Step-by-step walkthroughs

### 4. Session Checkpointing
For long-horizon tasks (>100 tool calls):
- Save intermediate outputs
- Record decision rationale
- Enable resume from checkpoint
- Track resource usage

## Usage Flow

```typescript
// User request
"Explain how the Raft consensus algorithm works"

// Agent flow
1. ConceptAnalyzer: Identifies as distributed systems algorithm, complexity: high
2. TaskPlanner: Breaks into subtasks:
   - Research Raft algorithm
   - Identify key components (leader election, log replication)
   - Design multi-stage visualization
   - Generate interactive simulation
   - Add step-through controls

3. ResearchAgent: Gathers Raft papers, existing visualizations
4. VisualizationPlanner: Selects D3.js + state machine diagram
5. VisualizationGenerator: Creates:
   - Mermaid state diagram for overview
   - D3.js interactive simulation with:
     * Cluster of nodes
     * Message passing animation
     * Log replication visual
     * Leader election simulation
     * Timeline controls

6. QualityAssurance:
   - Executes code ✓
   - Renders HTML ✓
   - LLM judges accuracy ✓
   - Takes screenshot for verification ✓

7. Output: HTML file + explanation document
```

## Performance Optimization

### Context Management
- Use subagents to isolate research/generation/verification contexts
- Compress research findings before passing to generation
- Archive intermediate outputs to files rather than keeping in memory

### Parallel Execution
- Research + template selection in parallel
- Generate multiple visualization variants concurrently
- Verify different aspects simultaneously

### Caching
- Cache common concept patterns
- Reuse visualization templates
- Store rendered outputs for similar concepts

## Extensibility

### MCP Integrations
- **GitHub MCP**: Fetch example code from repositories
- **Figma MCP**: Export design references
- **Database MCP**: Query real data for visualizations
- **Slack MCP**: Share results directly

### Custom Visualization Types
Plugin system for adding new visualizers:
```typescript
interface VisualizationPlugin {
  name: string;
  supportedConcepts: ConceptType[];
  generate(concept: Concept): Promise<Output>;
  verify(output: Output): Promise<boolean>;
}
```

## Success Metrics

- **Accuracy**: Visualization correctly represents concept (LLM judge + human eval)
- **Clarity**: Users understand concept after viewing (user testing)
- **Completeness**: All key aspects covered (checklist validation)
- **Performance**: Time to generate, token efficiency
- **Robustness**: Success rate across diverse concepts

## Future Enhancements

1. **Multi-Agent Collaboration**: Specialist agents for domains (math, CS, physics)
2. **Iterative Refinement**: User feedback loop for continuous improvement
3. **Style Transfer**: Apply visual themes (minimalist, detailed, animated)
4. **Multi-Language**: Generate explanations in multiple languages
5. **Accessibility**: Screen-reader support, color-blind friendly palettes
