"""Serve the Ashfall build and relay packets between two browsers."""
import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import secrets
from shutil import copyfileobj
from urllib.parse import urlsplit
from threading import Condition, Lock
import time

PAGE = Path(__file__).resolve().parent / "dist" / "index.html"
ROOMS = {}
LOCK = Lock()
WAKE = Condition(LOCK)  # đánh thức poll đang chờ khi peer vừa gửi gói
POLL_HOLD = 0.04       # giữ poll rỗng tối đa 40ms thay vì trả rỗng ngay
TIMEOUT = 120
PEER_STALE_AFTER = 3



def newest_snapshots(packets):
    latest = {}
    decoded = []
    for index, raw in enumerate(packets):
        try:
            packet = json.loads(raw)
            kind = packet.get("type") if isinstance(packet, dict) else None
        except (ValueError, TypeError):
            kind = None
        decoded.append(kind)
        if kind in ("world", "pose"):
            latest[kind] = index
    return [
        raw for index, raw in enumerate(packets)
        if decoded[index] not in ("world", "pose") or latest[decoded[index]] == index
    ]


def exchange(route, body, client_ip="-"):
    now = time.monotonic()
    with LOCK:
        for code, room in list(ROOMS.items()):
            if any(now - player["last"] > TIMEOUT for player in room.values()):
                del ROOMS[code]
                print("[LAN] Room expired: peer inactive for 120 seconds.", flush=True)

        if route in ("/lan/host", "/lan/join") and body.get("protocol") != 2:
            return 409, {"error": "Bản game LAN đã cũ. Tải lại trang bằng Ctrl+F5."}

        if route == "/lan/host":
            if len(ROOMS) >= 32:
                return 503, {"error": "Đang có quá nhiều phòng."}
            while True:
                code = str(secrets.randbelow(900000) + 100000)
                if code not in ROOMS:
                    break
            token = secrets.token_urlsafe(24)
            ROOMS[code] = {token: {"last": now, "inbox": []}}
            return 200, {"code": code, "token": token}

        code = body.get("code")
        room = ROOMS.get(code) if isinstance(code, str) else None
        if not room:
            if route == "/lan/poll":
                return 410, {"error": "Phiên LAN đã kết thúc. Hãy kiểm tra relay rồi tạo phòng mới."}
            return 404, {"error": "Phòng đã đóng hoặc mã không đúng."}
        if route == "/lan/join":
            if len(room) != 1:
                return 409, {"error": "Phòng đã đủ hai người."}
            token = secrets.token_urlsafe(24)
            room[token] = {"last": now, "inbox": []}
            return 200, {"code": code, "token": token}

        token = body.get("token")
        player = room.get(token) if isinstance(token, str) else None
        if not player:
            return 403, {"error": "Phiên chơi không hợp lệ."}
        if route == "/lan/leave":
            intent = body.get("intent")
            if intent not in ("leave-button", "cancel-setup"):
                print(f"[LAN] Ignored legacy leave request from {client_ip}.", flush=True)
                return 409, {"error": "Bản game LAN đã cũ. Tải lại trang bằng Ctrl+F5."}
            del ROOMS[code]
            print(f"[LAN] Room closed by {client_ip}: {intent}.", flush=True)
            return 200, {}
        packets = body.get("packets", [])
        if not isinstance(packets, list) or len(packets) > 32 or any(
            not isinstance(packet, str) or len(packet) > 16000 for packet in packets
        ):
            return 400, {"error": "Gói tin không hợp lệ."}
        player["last"] = now
        connected = len(room) == 2
        peer_active = False
        if connected:
            other = next(value for key, value in room.items() if key != token)
            peer_active = now - other["last"] <= PEER_STALE_AFTER
            if peer_active:
                other["inbox"] = newest_snapshots(other["inbox"] + packets)
            del other["inbox"][:-96]
            if packets:
                WAKE.notify_all()
        if route == "/lan/poll" and connected:
            deadline = time.monotonic() + POLL_HOLD
            while not player["inbox"] and ROOMS.get(code) is room:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                WAKE.wait(remaining)
            if ROOMS.get(code) is not room:
                return 410, {"error": "Phiên LAN đã kết thúc. Hãy kiểm tra relay rồi tạo phòng mới."}
            player["last"] = time.monotonic()
        inbox, player["inbox"] = newest_snapshots(player["inbox"]), []
        return 200, {"connected": connected, "peerActive": peer_active, "packets": inbox}


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def respond(self, status, content, media_type):
        self.send_response(status)
        self.send_header("Content-Type", media_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        # RAVEN_COOP_AVATAR
        asset_path = urlsplit(self.path).path
        if asset_path in ("/assets/raven-coop.glb", "/assets/m416-red-dot.glb", "/assets/triple-t-coop.glb"):
            asset = Path(__file__).resolve().parent / "assets" / Path(asset_path).name
            try:
                with asset.open("rb") as content:
                    self.send_response(200)
                    self.send_header("Content-Type", "model/gltf-binary")
                    self.send_header("Content-Length", str(asset.stat().st_size))
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    copyfileobj(content, self.wfile)
            except FileNotFoundError:
                self.send_error(404)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        path = urlsplit(self.path).path
        if path == "/healthz":
            ready = PAGE.is_file()
            self.respond(200 if ready else 503, b"OK" if ready else b"Game build missing", "text/plain")
            return
        if path not in ("/", "/index.html"):
            self.send_error(404)
            return
        try:
            with PAGE.open("rb") as page:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(PAGE.stat().st_size))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                copyfileobj(page, self.wfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        if self.path not in ("/lan/host", "/lan/join", "/lan/poll", "/lan/leave"):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 524288:
                raise ValueError()
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, OSError):
            self.send_error(400)
            return
        status, data = exchange(self.path, body, self.client_address[0])
        self.respond(status, json.dumps(data).encode(), "application/json")

    def log_message(self, fmt, *args):
        if getattr(self, "path", None) not in ("/lan/poll", "/healthz"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=os.environ.get("PORT", "8000"))
    args = parser.parse_args()
    if not PAGE.is_file():
        parser.exit(1, f"Missing {PAGE}. Copy the current Ashfall build into dist/index.html.\n")
    with ThreadingHTTPServer((args.bind, args.port), Handler) as server:
        print(f"Ashfall relay ready on {args.bind}:{args.port}. Open /?lan=1 for co-op.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass