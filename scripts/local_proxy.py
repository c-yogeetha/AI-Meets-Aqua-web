#!/usr/bin/env python3
"""Local HTTP reverse proxy matching deploy/Caddyfile.local for local smoke testing."""

import sys
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

BACKEND_ORIGIN = "http://127.0.0.1:8000"
FRONTEND_ORIGIN = "http://127.0.0.1:3000"
PORT = 8080


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self._proxy("GET")

    def do_POST(self):
        self._proxy("POST")

    def do_PUT(self):
        self._proxy("PUT")

    def do_PATCH(self):
        self._proxy("PATCH")

    def do_DELETE(self):
        self._proxy("DELETE")

    def do_HEAD(self):
        self._proxy("HEAD")

    def _proxy(self, method: str):
        path = self.path
        is_backend = path.startswith("/api/") or path == "/health" or path.startswith("/health?")
        target_origin = BACKEND_ORIGIN if is_backend else FRONTEND_ORIGIN
        target_url = f"{target_origin}{path}"

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        req = urllib.request.Request(target_url, data=body, method=method)
        for key, val in self.headers.items():
            if key.lower() not in ("host", "connection", "keep-alive"):
                req.add_header(key, val)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ("transfer-encoding", "connection", "server", "content-length"):
                        self.send_header(k, v)
                self.send_header("Content-Length", str(len(resp_body)))
                self.send_header("Server", "Matsya-Proxy")
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(resp_body)
                self.close_connection = True
        except urllib.error.HTTPError as err:
            err_body = err.read()
            self.send_response(err.code)
            for k, v in err.headers.items():
                if k.lower() not in ("transfer-encoding", "connection", "server", "content-length"):
                    self.send_header(k, v)
            self.send_header("Content-Length", str(len(err_body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(err_body)
            self.close_connection = True
        except Exception as exc:
            err_msg = f"Proxy error: {exc}".encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(err_msg)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(err_msg)
            self.close_connection = True

    def log_message(self, format, *args):
        # Silent logging for speed
        pass


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), ProxyHandler)
    print(f"Local proxy running on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
