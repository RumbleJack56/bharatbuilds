# APK (Android)

The APK is the same `web/` folder wrapped by Capacitor. Only `config.js` differs: `API_BASE` points at the server.

```
make apk API=https://13-233-10-20.sslip.io     # from rain-ready/
adb install -r mobile/rain-ready.apk
```

Notes
- The API must be HTTPS (Caddy + sslip.io from the deploy runbook). Camera and GPS need a secure origin; the app also declares the Android permissions.
- The server already allows cross-origin calls (`CORS_ORIGINS=*` by default) because the app runs from `https://localhost` inside the WebView.
- Unsigned debug build; fine for a demo. Enable "install unknown apps" on the phone.
- `android/`, `www/`, `node_modules/` and the `.apk` are git-ignored; rebuild any time.
