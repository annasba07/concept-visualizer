/**
 * End-to-end test with real API calls
 * Tests the full agent with a simple concept
 */

import { ConceptAgent } from './src/agent/core/ConceptAgent.js';

async function testFullAgent() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Concept Visualizer - End-to-End Test                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  console.log('✓ API key found\n');

  // Initialize agent
  const agent = new ConceptAgent({
    model: 'claude-sonnet-4-5-20250929',
    apiKey,
    maxContextLength: 200000,
    enableCheckpoints: true,
    parallelSubagents: true,
    verificationLevel: 'standard',
    outputDirectory: './output',
  });

  console.log('✓ Agent initialized\n');

  // Test with a simple concept
  console.log('🧪 Testing with simple concept: "stack data structure"\n');
  console.log('This will test:');
  console.log('  - Task planning and decomposition');
  console.log('  - Research agent (concept analysis)');
  console.log('  - Visualization strategy selection');
  console.log('  - Visualization code generation');
  console.log('  - Multi-layered verification');
  console.log('  - Memory management\n');

  try {
    const startTime = Date.now();

    const result = await agent.visualizeConcept('stack data structure');

    const duration = (Date.now() - startTime) / 1000;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                     TEST RESULTS                          ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (result.success) {
      console.log('✅ SUCCESS - Visualization completed!\n');

      console.log('📊 Metrics:');
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Tool calls: ${result.metadata.toolCalls}`);
      console.log(`   Tokens used: ${result.metadata.tokensUsed}`);
      console.log(`   Checkpoints: ${result.metadata.checkpointsUsed}`);
      console.log();

      console.log('📋 Concept Analysis:');
      console.log(`   Type: ${result.concept.type}`);
      console.log(`   Complexity: ${result.concept.complexity}`);
      console.log(`   Domain: ${result.concept.domain}`);
      console.log(`   Keywords: ${result.concept.keywords.join(', ')}`);
      console.log();

      console.log('🎨 Visualizations Generated:');
      for (const viz of result.visualizations) {
        console.log(`   ✓ ${viz.type} (${viz.format})`);
        console.log(`     File: ${viz.filePath}`);
        console.log(`     Lines of code: ${viz.metadata.linesOfCode}`);
        console.log(`     Verification: ${viz.verification.passed ? '✓ PASSED' : '✗ FAILED'}`);
        if (viz.verification.issues.length > 0) {
          console.log(`     Issues: ${viz.verification.issues.join(', ')}`);
        }
        console.log();
      }

      console.log('📝 Explanation:');
      console.log(`   Overview: ${result.explanations.overview.slice(0, 150)}...`);
      console.log(`   Sections: ${result.explanations.sections.length}`);
      for (const section of result.explanations.sections) {
        console.log(`     - ${section.title}`);
      }
      console.log();

      console.log('💾 Memory Stats:');
      const stats = agent.getStats();
      console.log(`   Immediate memory: ${stats.memory.immediateCount} items`);
      console.log(`   Compressed memory: ${stats.memory.compressedCount} items`);
      console.log(`   Archived memory: ${stats.memory.archivedCount} items`);
      console.log(`   Utilization: ${stats.memory.utilizationPercent.toFixed(2)}%`);
      console.log();

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ All agent components working correctly!');
      console.log('═══════════════════════════════════════════════════════════\n');

    } else {
      console.log('❌ FAILED - Visualization incomplete\n');
      console.log('Errors:');
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
      console.log();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testFullAgent();
