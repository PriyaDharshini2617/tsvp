#!/usr/bin/env python3
"""
TSVP — The Smart Vascular Predictor
Secure Local Static Server & Medical AI Backend Gateway
"""

import http.server
import socketserver
import os
import json
import urllib.request
import urllib.error

PORT = int(os.environ.get("PORT", 8000))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()

class TSVPRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = http.server.SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map['.glb'] = 'model/gltf-binary'
    extensions_map['.gltf'] = 'model/gltf+json'
    extensions_map['.wasm'] = 'application/wasm'

    def end_headers(self):
        # Enable CORS for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # API Health & Config Status endpoint
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            status_data = {
                "status": "online",
                "system": "TSVP Medical AI Gateway",
                "ai_configured": bool(OPENAI_API_KEY)
            }
            self.wfile.write(json.dumps(status_data).encode('utf-8'))
            return

        # Default static file routing
        if self.path == '/' or self.path == '':
            self.path = '/index.html'

        return super().do_GET()

    def do_POST(self):
        # Secure AI Assistant Chat endpoint
        if self.path == '/api/chat':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                body = json.loads(post_data.decode('utf-8'))
                user_message = body.get('message', '').strip()
            except Exception:
                user_message = ''

            if not user_message:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty message"}).encode('utf-8'))
                return

            # Check if OpenAI API key is configured
            if not OPENAI_API_KEY:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    "setup_required": True,
                    "message": "OPENAI_API_KEY environment variable is not configured on the server. Please set OPENAI_API_KEY to activate live OpenAI responses.",
                    "reply": None
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

            # Call OpenAI Chat Completions API with medical safety system instructions
            try:
                openai_payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are the TSVP Clinical AI Assistant, an advanced cardiovascular medical information engine. "
                                "Your purpose is to provide clear, empathetic, and evidence-based cardiovascular health education to patients. "
                                "CRITICAL SAFETY GUIDELINES:\n"
                                "1. Never claim to diagnose a disease or produce a clinically validated risk score.\n"
                                "2. Do not invent symptoms, measurements, or patient data.\n"
                                "3. For acute symptoms (severe crushing chest pain, pain radiating to arm or jaw, severe shortness of breath, sudden weakness/numbness), "
                                "you MUST immediately instruct the user to seek emergency medical care (e.g. call 911 or local emergency services).\n"
                                "4. Always explain that you are an educational AI tool and not a substitute for a licensed healthcare professional.\n"
                                "5. Recommend relevant questions or symptom tracking patterns the user can bring to their physician.\n"
                                "6. You may ask 1-2 thoughtful clarifying follow-up questions to understand the symptom context better."
                            )
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ],
                    "temperature": 0.4,
                    "max_tokens": 400
                }

                req = urllib.request.Request(
                    "https://api.openai.com/v1/chat/completions",
                    data=json.dumps(openai_payload).encode('utf-8'),
                    headers={
                        "Authorization": f"Bearer {OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    }
                )

                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_data = json.loads(resp.read().decode('utf-8'))
                    reply = resp_data["choices"][0]["message"]["content"].strip()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"reply": reply}).encode('utf-8'))

            except urllib.error.HTTPError as e:
                err_text = e.read().decode('utf-8', errors='ignore')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"OpenAI Gateway Error: {e.code}", "details": err_text}).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    # Ensure working directory is the script folder
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TSVPRequestHandler) as httpd:
        print(f"[*] TSVP Server active at http://localhost:{PORT}")
        print(f"[*] OpenAI API Key configured: {'YES' if OPENAI_API_KEY else 'NO (running in clinical triage mode)'}")
        httpd.serve_forever()
