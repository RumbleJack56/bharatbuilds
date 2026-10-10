"""Helpers for the rehearsal data and the demo flow: a captioned photo with real EXIF, and a thin client over the HTTP API.
Every picture says DEMO on it. Nothing here touches the database directly: all of it goes through the API."""
import io
import random
import secrets
from datetime import datetime, timezone

from PIL import Image, ImageDraw

PERSONAS = {"resident": ("res-1", "res-2"), "mcd": "off-mcd", "pwd": "off-pwd", "admin": "admin-1"}


def _dms(v: float):
    v = abs(v)
    d = int(v)
    m = int((v - d) * 60)
    return (d, m, round((v - d - m / 60) * 3600, 3))


def picture(seed: int, caption: str, lat: float, lon: float, taken: datetime) -> bytes:
    """A small JPEG: noise blocks (so each one hashes differently), a DEMO caption, GPS and time in EXIF."""
    rnd = random.Random(seed)
    img = Image.new("RGB", (16, 12))
    img.putdata([(rnd.randrange(60, 200), rnd.randrange(60, 200), rnd.randrange(60, 200)) for _ in range(192)])
    img = img.resize((480, 360), Image.BICUBIC)
    dr = ImageDraw.Draw(img)
    dr.rectangle((0, 0, 480, 34), fill=(20, 20, 20))
    dr.text((10, 11), f"DEMO PHOTO  {caption[:48]}", fill=(255, 255, 255))
    ex = Image.Exif()
    ex[0x8825] = {1: "N" if lat >= 0 else "S", 2: _dms(lat), 3: "E" if lon >= 0 else "W", 4: _dms(lon)}
    ex[0x8769] = {36867: taken.astimezone(timezone.utc).strftime("%Y:%m:%d %H:%M:%S")}
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=ex, quality=70)
    return buf.getvalue()


class Api:
    """Calls the API as a persona. `client` is a TestClient or an httpx.Client with base_url set."""

    def __init__(self, client, now=None):
        self.c, self.n, self.now = client, 0, now or (lambda: datetime.now(timezone.utc))
        self.salt = secrets.randbelow(10**9)           # a new run never reuses an earlier run's pictures

    def _photo(self, caption, lat, lon, off=(0.0, 0.0)):
        self.n += 1
        return {"photo": ("demo.jpg", picture(self.salt + self.n, caption, lat + off[0], lon + off[1], self.now()), "image/jpeg")}

    def h(self, user):
        return {"X-User-Id": user}

    def report(self, user, lat, lon, note, kind="blocked_drain", off=(0.0, 0.0)) -> dict:
        r = self.c.post("/api/incidents", data={"lat": lat, "lon": lon, "kind": kind, "note": note}, files=self._photo(note, lat, lon, off),
                        headers=self.h(user))
        r.raise_for_status()
        return r.json()

    def accept(self, user, tid):
        return self.c.post(f"/api/tasks/{tid}/accept", headers=self.h(user))

    def bounce(self, user, tid, reason, to):
        return self.c.post(f"/api/tasks/{tid}/reject", json={"reason": reason, "reassign_to": to}, headers=self.h(user))

    def assign(self, user, tid, agency):
        return self.c.post(f"/api/tasks/{tid}/assign", json={"agency_id": agency}, headers=self.h(user))

    def complete(self, user, tid, note, lat, lon):
        return self.c.post(f"/api/tasks/{tid}/complete", data={"note": note}, files=self._photo("after: " + note, lat, lon), headers=self.h(user))

    def confirm(self, user, tid, ok, note=""):
        return self.c.post(f"/api/tasks/{tid}/confirm", json={"ok": ok, "note": note}, headers=self.h(user))

    def plan(self, user, top=5):
        return self.c.post("/api/plan/generate", params={"top": top}, headers=self.h(user)).json()

    def review(self, user, incident_id, decision, note):
        return self.c.post(f"/api/incidents/{incident_id}/review", json={"decision": decision, "note": note}, headers=self.h(user))
