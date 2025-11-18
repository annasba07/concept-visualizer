/**
 * Concept Visualizer Agent - Main Entry Point
 *
 * An autonomous agent that creates sophisticated visualizations
 * to explain any concept using long-horizon task planning.
 */

import { ConceptAgent } from './agent/core/ConceptAgent.js';
import { AgentConfig } from './types/index.js';
import * as readline from 'readline';

// Export main components for library usage
export { ConceptAgent } from './agent/core/ConceptAgent.js';
export { MemoryManager } from './agent/core/MemoryManager.js';
export { TaskPlanner } from './agent/core/TaskPlanner.js';
export * from './types/index.js';

/**
 * CLI Interface for interactive usage
 */
async function runCLI() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Concept Visualizer Agent - Interactive Mode         ║');
  console.log('║                                                            ║');
  console.log('║  Built with Claude Agent SDK + Latest 2025 Research       ║');
  console.log('║  - MemAct: Context curation                                ║');
  console.log('║  - HiAgent: Hierarchical task planning                     ║');
  console.log('║  - ReAct: Reasoning and acting loop                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('Please set it with: export ANTHROPIC_API_KEY="your-api-key"');
    process.exit(1);
  }

  // Initialize agent
  const config: AgentConfig = {
    model: 'claude-sonnet-4-5-20250929',
    apiKey,
    maxContextLength: 200000,
    enableCheckpoints: true,
    checkpointInterval: 50,
    parallelSubagents: true,
    verificationLevel: 'standard',
    outputDirectory: './output',
  };

  const agent = new ConceptAgent(config);

  console.log('Agent initialized successfully!');
  console.log('Output directory: ./output');
  console.log();
  console.log('Commands:');
  console.log('  visualize <concept> - Create visualization for a concept');
  console.log('  examples           - Show example concepts');
  console.log('  stats              - Show agent statistics');
  console.log('  quit               - Exit');
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    if (input === 'quit' || input === 'exit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }

    if (input === 'examples') {
      showExamples();
      rl.prompt();
      return;
    }

    if (input === 'stats') {
      const stats = agent.getStats();
      console.log('\nAgent Statistics:');
      console.log('  Memory:', JSON.stringify(stats.memory, null, 2));
      console.log('  Checkpoints:', stats.checkpoints);
      console.log();
      rl.prompt();
      return;
    }

    if (input.startsWith('visualize ')) {
      const concept = input.substring(10).trim();

      if (!concept) {
        console.log('Please provide a concept to visualize');
        rl.prompt();
        return;
      }

      console.log();
      console.log('Starting visualization...');

      try {
        const result = await agent.visualizeConcept(concept);

        if (result.success) {
          console.log('\n✓ Visualization complete!');
          console.log(`  Visualizations created: ${result.visualizations.length}`);
          console.log(`  Time: ${(result.metadata.totalTime / 1000).toFixed(2)}s`);
          console.log(`  Tool calls: ${result.metadata.toolCalls}`);
          console.log();

          console.log('Overview:');
          console.log(result.explanations.overview);
          console.log();

          console.log('Files created:');
          for (const viz of result.visualizations) {
            console.log(`  - ${viz.filePath}`);
          }
          console.log();
        } else {
          console.log('\n✗ Visualization failed');
          console.log('Errors:', result.errors.join(', '));
          console.log();
        }
      } catch (error) {
        console.error('\nError:', error);
        console.log();
      }

      rl.prompt();
      return;
    }

    console.log('Unknown command. Type "quit" to exit or "examples" for help.');
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

function showExamples() {
  console.log('\nExample Concepts to Visualize:');
  console.log();
  console.log('Algorithms:');
  console.log('  visualize quicksort algorithm');
  console.log('  visualize binary search tree');
  console.log('  visualize Dijkstra\'s shortest path');
  console.log();
  console.log('Data Structures:');
  console.log('  visualize hash table with collision resolution');
  console.log('  visualize balanced binary tree');
  console.log();
  console.log('System Architecture:');
  console.log('  visualize microservices architecture');
  console.log('  visualize distributed consensus with Raft');
  console.log();
  console.log('Mathematical:');
  console.log('  visualize Fourier transform');
  console.log('  visualize gradient descent');
  console.log();
  console.log('Process Flow:');
  console.log('  visualize software development lifecycle');
  console.log('  visualize CI/CD pipeline');
  console.log();
}

/**
 * Programmatic API example
 */
export async function example() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const agent = new ConceptAgent({
    model: 'claude-sonnet-4-5-20250929',
    apiKey,
  });

  const result = await agent.visualizeConcept('binary search tree');

  console.log('Result:', result);
  return result;
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch(console.error);
}
