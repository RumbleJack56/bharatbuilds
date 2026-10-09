# In-app photo capture and stamp (spec for web/ and the APK)

Goal: a report photo that shows where and when it was taken, and that is hard to fake. Soft flags only; see `docs/API.md`.

## Flow
1. Resident taps "Take photo". The app calls `GET /api/capture-token` and keeps `token`, `ref`, `server_time`.
2. The app opens the **live camera** (`getUserMedia`, back camera). No gallery picker, no `<input type=file>`.
3. At the moment of capture the app reads `navigator.geolocation.getCurrentPosition` (high accuracy) and draws onto the image (canvas) a stamp block like GPS Map Camera, bottom left:
   ```
   <address line, optional>
   Lat 28.543210°
   Long 77.182223°
   18/10/26 01:05 PM GMT +05:30
   Ref 7QK2
   ```
   Use the **phone clock for the time** and the `ref` from the token. Font at least 3% of the image height, white text on a dark box, so OCR reads it.
4. The app sends the stamped JPEG as `photo`, plus `lat`, `lon` (same values as the stamp), `accuracy_m` (`coords.accuracy`) and `capture_token`.
5. If location is denied or accuracy is worse than 100 m, tell the resident and let them retry. Do not stamp a guessed position.

## What the server does
- Token: valid, this user, under 15 minutes old. Otherwise flag `photo_not_live`.
- Stamp: Bedrock reads the overlay text. The server compares Lat/Long (within 50 m of the report), time (within 15 minutes) and the Ref. Mismatch gives a warn flag and the report is held.
- Also: EXIF geotag, perceptual-hash reuse, stale photo (`core/photocheck.py`).
- Stamp reading needs `TRIAGE_MODE=bedrock`. Without it the flag is `stamp_unverified` (info).

## What this does not prove
A rooted phone with a fake-GPS app and a patched app can still stamp a false place. The checks make false reports costly and visible. Do not say "unspoofable" in the UI or video. Say "location and time stamped, checked against the report".
For real attestation the APK would need Play Integrity. That is out of scope.

## Server settings
`CAPTURE_SECRET` (set a long random value on the server), `REQUIRE_LIVE_CAPTURE=1` once the in-app camera ships.
