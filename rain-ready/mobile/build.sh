#!/usr/bin/env bash
# Build a debug APK from ../web. Usage: ./build.sh https://<host>   (the API base the app will call)
# Needs: node, JDK 17, Android SDK (ANDROID_HOME). First run does `npm install` and `cap add android`.
set -euo pipefail
API="${1:?usage: ./build.sh https://your-host}"
cd "$(dirname "$0")"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
rm -rf www && mkdir www && cp -r ../web/. www/
printf 'window.API_BASE = "%s";\n' "${API%/}" > www/config.js     # only difference from the website
[ -d node_modules ] || npm install
[ -d android ] || npx cap add android
M=android/app/src/main/AndroidManifest.xml
for p in CAMERA ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
  grep -q "android.permission.$p" "$M" || sed -i "s#<application#<uses-permission android:name=\"android.permission.$p\" />\n    <application#" "$M"
done
npx cap sync android
(cd android && ./gradlew assembleDebug -q)
cp android/app/build/outputs/apk/debug/app-debug.apk rain-ready.apk
echo "built mobile/rain-ready.apk  (install: adb install -r mobile/rain-ready.apk)"
