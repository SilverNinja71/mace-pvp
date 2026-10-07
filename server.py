#!/usr/bin/env python3
"""
Spear-Mace PVP - Local Game Server
Serves the game locally and opens it in your default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    port = PORT
    server = None
    
    # Try preferred port, or fall back to an available port
    for p in range(PORT, PORT + 20):
        try:
            server = socketserver.TCPServer(("", p), Handler)
            port = p
            break
        except OSError:
            continue

    if not server:
        print("Error: Could not bind to any port from 8080 to 8100.")
        sys.exit(1)

    url = f"http://localhost:{port}/index.html"
    print("=" * 55)
    print("⚔️  SPEAR-MACE PVP - Game Server Running!")
    print(f"👉 Local URL: {url}")
    print("⌨️  Controls: WASD/Arrows to move, Space to Dash, Down/S to Slam")
    print("🛑 Press Ctrl+C to stop the server.")
    print("=" * 55)

    # Open in browser automatically
    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped. Thanks for playing!")
        server.server_close()

if __name__ == "__main__":
    run()
