# FunnelSwift Mobile — how to build the APK (no EAS, no Expo account)

The old instructions here told you to run `npx eas build`, which needs Expo credentials and a
network round-trip. It is not how the shipped APK was produced, and it is not needed.

## Build (containerised toolchain — the host has no JDK or Android SDK)

```bash
bash /opt/swift/scripts/build-mobile-apk.sh
```

That script:
1. restores the signing keystore (see `/opt/swift/keystores/README.md`) into `android/app/`
2. runs `./gradlew assembleRelease` inside `reactnativecommunity/react-native-android`
   with this repo bind-mounted at `/work` — nothing is installed on the host
3. leaves the APK at `android/app/build/outputs/apk/release/app-release.apk`
4. logs the whole build to `/var/log/funnelswift-mobile-build.log`

## Publish

```bash
python3 /opt/swift/scripts/publish-apk.py      # copies it to the URL the download page links
python3 /opt/swift/scripts/verify-apk-signature.py   # structural + v2/v3 signature + live download
```

The download page (`www-app/download-app.html`) links to
**https://funnelswift.net/funnelswift.apk**, served from `/opt/swift/nginx/www/funnelswift/`.
The APK is ~111 MB and is deliberately NOT committed to git (it was removed once before for size);
it lives on the web root.

## Facts worth knowing

- Release builds are signed with the **debug** keystore (React-Native default). Installable and
  fine for internal distribution; **Play Store needs a real release key**.
- The build takes a few minutes and produces 4 ABIs (arm64-v8a, armeabi-v7a, x86, x86_64).
- `android/` is gitignored/generated. Only edit it if you also fix the generator.
