/**
 * Try to read OAuth token from file descriptor
 */

import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

async function testWithOAuthToken() {
  console.log('Attempting to read OAuth token from FD...\n');

  const fd = parseInt(process.env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR || '0');

  if (!fd) {
    console.error('No file descriptor found');
    return false;
  }

  try {
    // Try to read from the file descriptor
    const buffer = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);

    if (bytesRead > 0) {
      const token = buffer.toString('utf8', 0, bytesRead).trim();
      console.log('✓ Read token from FD (length:', token.length, ')');

      // Try using it with the Anthropic client
      const client = new Anthropic({
        authToken: token
      });

      console.log('Making API call with OAuth token...');
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Say "OAuth working!"'
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log('✅ SUCCESS:', text);
      return true;
    }
  } catch (error) {
    console.error('❌ Error reading FD:', error instanceof Error ? error.message : error);
  }

  return false;
}

testWithOAuthToken();
