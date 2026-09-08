import http.server
import socketserver
import json
import time
import os

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Thread-safe event queue & last ping timestamp
events = []
last_bga_ping = 0

class TrackerRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle CORS Preflight for cross-origin Tampermonkey requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        self.end_headers()

    def do_POST(self):
        global last_bga_ping
        if self.path == '/api/log':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
                log_text = data.get('logText', '')
                if log_text:
                    events.append({
                        'type': 'BGA_EVENT',
                        'logText': log_text,
                        'timestamp': data.get('timestamp', int(time.time() * 1000))
                    })
                    last_bga_ping = time.time()
                self._send_json({'status': 'ok', 'received': log_text})
            except Exception as e:
                self._send_json({'error': str(e)}, status=400)
        elif self.path == '/api/ping':
            last_bga_ping = time.time()
            self._send_json({'status': 'pong', 'timestamp': time.time()})
        else:
            self.send_error(404)

    def do_GET(self):
        global last_bga_ping
        if self.path.startswith('/api/log'):
            import urllib.parse
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            log_text = params.get('text', [''])[0]
            if log_text:
                events.append({
                    'type': 'BGA_EVENT',
                    'logText': log_text,
                    'timestamp': int(time.time() * 1000)
                })
                last_bga_ping = time.time()
            self.send_response(200)
            self.send_header('Content-Type', 'image/gif')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')
            return
        elif self.path.startswith('/api/ping'):
            last_bga_ping = time.time()
            self.send_response(200)
            self.send_header('Content-Type', 'image/gif')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')
            return
        elif self.path.startswith('/api/poll'):
            since = 0
            if 'since=' in self.path:
                try:
                    since = int(self.path.split('since=')[1].split('&')[0])
                except Exception:
                    since = 0
            
            new_events = events[since:]
            is_connected = (time.time() - last_bga_ping) < 15.0 if last_bga_ping > 0 else False
            
            self._send_json({
                'connected': is_connected,
                'lastPingSecAgo': round(time.time() - last_bga_ping, 1) if last_bga_ping > 0 else None,
                'nextSince': len(events),
                'events': new_events
            })
        elif self.path == '/api/status':
            is_connected = (time.time() - last_bga_ping) < 15.0 if last_bga_ping > 0 else False
            self._send_json({
                'connected': is_connected,
                'lastPing': last_bga_ping,
                'eventCount': len(events),
                'serverTime': time.time()
            })
        else:
            super().do_GET()

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    # Allow address reuse to prevent WinError 10048 when restarting quickly
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), TrackerRequestHandler) as httpd:
        print(f"[Flip 7 Tracker Server] Running on http://localhost:{PORT}")
        httpd.serve_forever()
