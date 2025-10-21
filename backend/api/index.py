from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json

class Handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()
        
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/health':
            self._set_headers(200)
            response = {"ok": True}
            self.wfile.write(json.dumps(response).encode())
        elif path in ['/', '/api', '/api/']:
            self._set_headers(200)
            response = {"status": "ok", "message": "TheNoReal API"}
            self.wfile.write(json.dumps(response).encode())
        else:
            self._set_headers(404)
            response = {"error": "Not found"}
            self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Leer el body
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
                return
        else:
            body = {}

        if path == '/api/prompt/generate':
            self._handle_generate_prompt(body)
        elif path == '/api/story':
            self._handle_story(body)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def _handle_generate_prompt(self, body):
        try:
            result = {
                "prompt": "Texto generado según config.",
                "debug": body
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_story(self, body):
        try:
            story_text = body.get("story", "")
            if not story_text or len(story_text.strip()) == 0:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "story no puede estar vacío"}).encode())
                return

            options_per_decision = body.get("optionsPerDecision", 2)
            chapter = {
                "text": f"Capítulo inicial para: {story_text}",
                "options": ["Opción A", "Opción B"][:options_per_decision]
            }
            
            result = {"chapter": chapter}
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())