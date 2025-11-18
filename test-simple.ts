/**
 * Simple API test to verify we can make calls
 */

import Anthropic from '@anthropic-ai/sdk';

async function testAPI() {
  console.log('Testing Anthropic API access...\n');

  // Try different auth methods
  const authMethods = [
    { name: 'Environment ANTHROPIC_API_KEY', key: process.env.ANTHROPIC_API_KEY },
    { name: 'Inferred from environment', key: undefined },
  ];

  for (const method of authMethods) {
    console.log(`Trying: ${method.name}`);

    try {
      const client = new Anthropic(method.key ? { apiKey: method.key } : {});

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Say "API test successful" in 3 words or less.'
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log(`✅ SUCCESS: ${text}`);
      console.log(`   Input tokens: ${response.usage.input_tokens}`);
      console.log(`   Output tokens: ${response.usage.output_tokens}`);
      console.log(`   Model: ${response.model}\n`);
      return true;
    } catch (error) {
      console.log(`❌ Failed: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  return false;
}

testAPI().then(success => {
  if (!success) {
    console.log('Could not authenticate with any method.');
    console.log('\nEnvironment info:');
    console.log('  CLAUDE_CODE_SESSION_ID:', process.env.CLAUDE_CODE_SESSION_ID);
    console.log('  ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL);
    console.log('  Running in Claude Code:', !!process.env.CLAUDECODE);
  }
});
