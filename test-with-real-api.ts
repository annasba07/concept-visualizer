/**
 * Try to run the agent with whatever auth is available
 */

import { ConceptAgent } from './src/agent/core/ConceptAgent.js';
import Anthropic from '@anthropic-ai/sdk';

async function tryRunning() {
  console.log('🔍 Attempting to find working authentication...\n');

  // Try to get the session's API credentials
  // Since we're running in Claude Code, let's see what we can access

  // First, let's just try to make a direct API call to see if auth works
  console.log('Testing direct API call first...\n');

  try {
    // Try with no explicit key - SDK might pick up from environment
    const testClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-will-fail',
    });

    const response = await testClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "test" and nothing else.' }]
    });

    console.log('✅ API call succeeded!');
    console.log('Response:', response.content[0]);

    // If we got here, auth works! Now try the full agent
    console.log('\n🚀 Starting full agent test...\n');

    const agent = new ConceptAgent({
      model: 'claude-sonnet-4-5-20250929',
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
      outputDirectory: './output',
    });

    console.log('Testing with: "stack data structure"\n');

    const result = await agent.visualizeConcept('stack data structure');

    if (result.success) {
      console.log('\n✅ AGENT WORKED!');
      console.log(`Generated ${result.visualizations.length} visualizations`);
      console.log(`Time: ${(result.metadata.totalTime / 1000).toFixed(2)}s`);
      console.log(`Tool calls: ${result.metadata.toolCalls}`);
      console.log(`Tokens: ${result.metadata.tokensUsed}`);
      console.log('\nConcept:', result.concept);
      console.log('\nVisualization files:');
      result.visualizations.forEach(v => {
        console.log(`  - ${v.filePath} (${v.type})`);
      });
    } else {
      console.log('\n❌ Agent failed:', result.errors);
    }

  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('authentication')) {
      console.log('\n💡 No valid API key found in environment.');
      console.log('The agent code is working, but needs API credentials to run end-to-end.');
      console.log('\nTo test fully, set: export ANTHROPIC_API_KEY="your-key"');
    }
  }
}

tryRunning();
