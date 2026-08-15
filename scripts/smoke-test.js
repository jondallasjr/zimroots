import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const logFile = path.resolve(process.cwd(), 'logs', 'smoke-test.log');
const summaryFile = path.resolve(process.cwd(), 'logs', 'smoke-test-summary.json');

const tests = [
    {
        name: 'greeting',
        payload: { From: 'whatsapp:+263712345678', Body: 'hello' },
        assert: (body) => /Welcome to ZimRoots|What can I help you with/i.test(body),
    },
    {
        name: 'search',
        payload: { From: 'whatsapp:+263712345678', Body: 'find a mechanic in Harare' },
        assert: (body) => /Got it! Let me search for mechanics in Harare|search for mechanics in Harare/i.test(body),
    },
    {
        name: 'post',
        payload: { From: 'whatsapp:+263712345678', Body: 'I want to sell my phone' },
        assert: (body) => /Great! I can help you list your phone|First, what's your name\?/i.test(body),
    },
];

function ensureLogDir() {
    const dir = path.dirname(logFile);
    fs.mkdirSync(dir, { recursive: true });
}

function appendLog(line) {
    ensureLogDir();
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`, 'utf8');
}

async function runWebhook(payload) {
    const baseUrl = process.env.LOCAL_WEBHOOK_URL || 'http://localhost:3000/webhook';
    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    return {
        ok: response.ok,
        status: response.status,
        body: text,
    };
}

async function main() {
    ensureLogDir();
    const results = [];
    let failures = 0;

    appendLog('Starting smoke tests');

    for (const test of tests) {
        const startedAt = Date.now();
        appendLog(`Running test: ${test.name}`);

        try {
            const response = await runWebhook(test.payload);
            const elapsedMs = Date.now() - startedAt;
            const body = response.body;
            const passed = response.ok && typeof test.assert === 'function' ? test.assert(body) : false;

            const outcome = {
                name: test.name,
                payload: test.payload,
                ok: passed,
                status: response.status,
                elapsedMs,
                response: body,
            };

            if (!passed) {
                failures += 1;
            }

            results.push(outcome);
            appendLog(`Result ${test.name}: ${passed ? 'PASS' : 'FAIL'} status=${response.status} elapsedMs=${elapsedMs}`);
            appendLog(`Body: ${body}`);
        } catch (error) {
            const elapsedMs = Date.now() - startedAt;
            const outcome = {
                name: test.name,
                payload: test.payload,
                ok: false,
                status: 0,
                elapsedMs,
                error: String(error),
            };

            failures += 1;
            results.push(outcome);
            appendLog(`Result ${test.name}: ERROR elapsedMs=${elapsedMs}`);
            appendLog(`Error: ${String(error)}`);
        }
    }

    const summary = {
        generatedAt: new Date().toISOString(),
        results,
        passed: failures === 0,
        failures,
    };

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
    appendLog(`Smoke test summary written to ${summaryFile}`);

    console.log(JSON.stringify(summary, null, 2));

    if (failures > 0) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('Smoke test failed to execute:', error);
    process.exit(1);
});
