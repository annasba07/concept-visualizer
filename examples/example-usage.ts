/**
 * Example usage of the Concept Visualizer Agent
 */

import { ConceptAgent } from '../src/agent/core/ConceptAgent.js';
import { AgentConfig } from '../src/types/index.js';

async function main() {
  // Setup configuration
  const config: AgentConfig = {
    model: 'claude-sonnet-4-5-20250929',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxContextLength: 200000,
    enableCheckpoints: true,
    parallelSubagents: true,
    verificationLevel: 'standard',
    outputDirectory: './examples/output',
  };

  // Initialize agent
  const agent = new ConceptAgent(config);

  console.log('=== Example 1: Simple Concept ===\n');

  // Example 1: Simple algorithm
  const result1 = await agent.visualizeConcept('stack data structure');

  console.log('Success:', result1.success);
  console.log('Visualizations:', result1.visualizations.length);
  console.log('Time:', result1.metadata.totalTime, 'ms');
  console.log('Overview:', result1.explanations.overview);
  console.log('\n---\n');

  console.log('=== Example 2: Medium Complexity ===\n');

  // Example 2: Medium complexity
  const result2 = await agent.visualizeConcept(
    'binary search algorithm',
    { detailLevel: 'standard' }
  );

  console.log('Success:', result2.success);
  console.log('Concept type:', result2.concept.type);
  console.log('Complexity:', result2.concept.complexity);
  console.log('Visualizations created:');
  for (const viz of result2.visualizations) {
    console.log(`  - ${viz.type}: ${viz.filePath}`);
  }
  console.log('\n---\n');

  console.log('=== Example 3: Complex Concept ===\n');

  // Example 3: Complex system
  const result3 = await agent.visualizeConcept(
    'distributed consensus with Raft algorithm',
    { detailLevel: 'comprehensive' }
  );

  console.log('Success:', result3.success);
  console.log('Tool calls used:', result3.metadata.toolCalls);
  console.log('Checkpoints:', result3.metadata.checkpointsUsed);
  console.log('Explanation sections:', result3.explanations.sections.length);

  for (const section of result3.explanations.sections) {
    console.log(`  - ${section.title}`);
  }

  console.log('\n---\n');

  console.log('=== Example 4: Mathematical Concept ===\n');

  // Example 4: Mathematical concept
  const result4 = await agent.visualizeConcept('gradient descent optimization');

  console.log('Success:', result4.success);
  console.log('Files created:');
  for (const viz of result4.visualizations) {
    console.log(`  ${viz.filePath}`);
    console.log(`    Type: ${viz.type}`);
    console.log(`    Format: ${viz.format}`);
    console.log(`    Lines of code: ${viz.metadata.linesOfCode}`);
    console.log(`    Verified: ${viz.verification.passed}`);
  }

  console.log('\n=== Agent Statistics ===\n');
  const stats = agent.getStats();
  console.log('Memory stats:', stats.memory);
  console.log('Total checkpoints:', stats.checkpoints);
}

// Run examples
main().catch(console.error);
