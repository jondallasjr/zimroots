import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is missing. Add it to your .env file before testing.');
    process.exit(1);
}

const client = new Anthropic({ apiKey });

try {
    const response = await client.models.list();
    const ids = response.data.map((m) => m.id);

    if (!ids.includes(model)) {
        console.error(`Model not available for this API key: ${model}`);
        console.error(`Available models: ${ids.slice(0, 20).join(', ')}`);
        process.exit(1);
    }

    const reply = await client.messages.create({
        model,
        max_tokens: 128,
        messages: [{ role: 'user', content: 'Reply with only: OK' }],
    });

    console.log(`Model OK: ${model}`);
    console.log(`Response: ${reply.content[0].text}`);
} catch (error) {
    console.error('Anthropic test failed:', error.message);
    process.exit(1);
}
