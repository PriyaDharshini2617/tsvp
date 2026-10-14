/**
 * TSVP — The Smart Vascular Predictor
 * Node.js Medical AI Dev Server & Gateway
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || '8000', 10);
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.wasm': 'application/wasm',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
    // Enable CORS & Security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Proxy to FastAPI backend on port 8000 for /health, /analyze, /recommendations
    if (['/health', '/api/health', '/analyze', '/api/analyze', '/recommendations', '/api/recommendations'].includes(pathname)) {
        const proxyReq = http.request({
            hostname: '127.0.0.1',
            port: 8000,
            path: req.url,
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (e) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                error_type: 'proxy_error',
                message: 'FastAPI backend on port 8000 is currently unreachable. Start it with: python -m uvicorn backend.main:app --port 8000'
            }));
        });

        req.pipe(proxyReq);
        return;
    }

    // 1. API: Server & AI Status Endpoint
    if (req.method === 'GET' && pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            system: 'TSVP Medical AI Gateway (Node.js)',
            ai_configured: Boolean(OPENAI_API_KEY)
        }));
        return;
    }

    // 2. API: AI Assistant Chat Endpoint
    if (req.method === 'POST' && pathname === '/api/chat') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) req.destroy(); // 1MB limit
        });

        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const userMessage = (parsed.message || '').trim();

                if (!userMessage) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Message cannot be empty.' }));
                    return;
                }

                // If API Key is not configured in environment
                if (!OPENAI_API_KEY) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        setup_required: true,
                        message: 'OPENAI_API_KEY environment variable is not configured on the server. Set OPENAI_API_KEY to activate live OpenAI responses.',
                        reply: null
                    }));
                    return;
                }

                // Call OpenAI API via built-in global fetch (Node 18+)
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: (
                                    'You are TSVP Clinical Assistant, an advanced cardiovascular medical information engine. ' +
                                    'Provide clear, empathetic, and evidence-based cardiovascular health education to patients. ' +
                                    'CRITICAL SAFETY GUIDELINES:\n' +
                                    '1. Never claim to diagnose a disease or produce a clinically validated risk score.\n' +
                                    '2. Do not invent symptoms, measurements, or patient data.\n' +
                                    '3. For acute symptoms (severe crushing chest pain, pain radiating to left arm/jaw, acute shortness of breath, sudden numbness), ' +
                                    'you MUST instruct the user to seek emergency medical care (call 911 or local emergency services) immediately.\n' +
                                    '4. Clearly explain that you are an educational AI tool and not a substitute for a licensed healthcare professional.\n' +
                                    '5. Recommend relevant questions or symptom tracking patterns the user can bring to their physician.\n' +
                                    '6. You may ask 1-2 thoughtful clarifying follow-up questions.'
                                )
                            },
                            {
                                role: 'user',
                                content: userMessage
                            }
                        ],
                        temperature: 0.4,
                        max_tokens: 400
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    res.writeHead(response.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'OpenAI API Error', details: errText }));
                    return;
                }

                const data = await response.json();
                const reply = data.choices?.[0]?.message?.content?.trim() || 'No response received from model.';

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply }));

            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 3. Static File Serving
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    if (safePath === '/' || safePath === '\\' || safePath === '') {
        safePath = '/index.html';
    }

    const filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

let currentPort = PORT;

function startServer(portToTry) {
    currentPort = portToTry;
    server.listen(portToTry, '0.0.0.0', () => {
        console.log(`\n======================================================`);
        console.log(`  TSVP — THE SMART VASCULAR PREDICTOR DEV SERVER`);
        console.log(`======================================================`);
        console.log(`  > Local:    http://localhost:${portToTry}`);
        console.log(`  > Patient:  http://localhost:${portToTry}/patient.html`);
        console.log(`  > API AI:   ${OPENAI_API_KEY ? 'CONFIGURED (OpenAI gpt-4o-mini)' : 'TRIAGE MODE (Set OPENAI_API_KEY for live AI)'}`);
        console.log(`======================================================\n`);
    });
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const nextPort = currentPort + 1;
        console.warn(`[!] Port ${currentPort} in use, trying next port http://localhost:${nextPort}...`);
        setTimeout(() => {
            startServer(nextPort);
        }, 200);
    } else {
        console.error('Server error:', err);
    }
});

startServer(PORT);
