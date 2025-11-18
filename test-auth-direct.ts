/**
 * Test if API calls work directly in Claude Code environment
 * without needing explicit API key
 */

import Anthropic from '@anthropic-ai/sdk';

async function testDirectAuth() {
  console.log('Testing if we can make API calls in Claude Code environment...\n');

  // Try without any explicit authentication
  // In Claude Code web, auth should be handled automatically
  try {
    const client = new Anthropic();

    console.log('Making test API call...');
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Respond with exactly: "Auth working!"'
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('✅ SUCCESS! Response:', text);
    console.log('Model:', response.model);
    console.log('Tokens - Input:', response.usage.input_tokens, 'Output:', response.usage.output_tokens);

    return true;
  } catch (error) {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);

    // Also try reading from process.stdin which might have the OAuth token
    console.log('\nTrying alternative auth methods...');
    console.log('FD 4 available:', process.env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR);

    return false;
  }
}

testDirectAuth();
