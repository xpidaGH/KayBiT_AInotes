# AInotes Cross-Platform Installation & Website Distribution Guide (`INSTALLATION.md`)

This step-by-step guide explains how to package, sign, and host **AInotes** so computer science students can install the app natively from direct download links on your course website across **Android**, **iOS**, **Windows**, and **macOS**, or install it immediately as a **Progressive Web App (PWA)** with offline caching and background TTS audio support.

---

## Architecture Overview for Native Packaging

AInotes is built on standard web + Express APIs with PWA support (`vite-plugin-pwa`). You can distribute the exact same client bundle across all four desktop and mobile targets:

| Platform | Output Artifacts | Recommended Packaging Tool | Background Audio & Stylus Support |
| :--- | :--- | :--- | :--- |
| **Android** | `.apk` (direct sideload), `.aab` (Play Store) | **Capacitor** or **Trusted Web Activity (Bubblewrap)** | `WAKE_LOCK`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, S-Pen / USI pointer events |
| **iOS / iPadOS** | Safari **PWA** (direct) or `.ipa` (TestFlight / Enterprise) | **Safari Add to Home Screen** or **Capacitor iOS** | `UIBackgroundModes: audio` in `Info.plist`, Apple Pencil `pointerType === 'pen'` |
| **Windows** | `.exe` (NSIS installer), `.msi` (WiX installer) | **Tauri v2** (lightweight Rust) or **Electron Builder** | Native OS WebView2, Pen/Touch Ink API, offline local storage |
| **macOS** | `.dmg` (Universal Apple Silicon + Intel) | **Tauri v2** or **Electron Builder** | WKWebView / Chromium speechSynthesis voices, Retina Canvas |

---

## 1. Preparing the Production Web Bundle

Before building any native wrapper, generate the production frontend bundle (`dist/`):

```bash
npm install
npm run build
```

Set your hosted backend API URL (where `server.ts` runs for `/api/htr/recognize` and `/api/study/*`) in `.env.production`:
```env
VITE_API_BASE_URL=https://ainotes.your-university.edu
```

---

## 2. Android (`.apk` & `.aab` Direct Download)

### Option A: Capacitor (Full Native WebView + Background Audio Permissions)

1. **Install Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "AInotes" "edu.cs.ainotes" --web-dir=dist
   npx cap add android
   ```

2. **Enable Background Audio & Storage Permissions** in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.WAKE_LOCK" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   <uses-permission android:name="android.permission.CAMERA" />
   ```
   Also ensure your `MainActivity.java` / `MainActivity.kt` enables WebView DOM storage and media playback without gesture restrictions if needed:
   ```kotlin
   bridge.webView.settings.apply {
       domStorageEnabled = true
       mediaPlaybackRequiresUserGesture = false
   }
   ```

3. **Generate a Signing Keystore**:
   ```bash
   keytool -genkey -v -keystore ainotes-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ainotes
   ```

4. **Build Signed `.apk` (for direct website download) and `.aab` (for Google Play)**:
   ```bash
   npm run build && npx cap sync android
   cd android
   ./gradlew assembleRelease   # Outputs: android/app/build/outputs/apk/release/app-release.apk
   ./gradlew bundleRelease     # Outputs: android/app/build/outputs/bundle/release/app-release.aab
   ```

5. **Student Sideload Instructions (for direct `.apk` link)**:
   - Download `AInotes-android-universal.apk` from the course website.
   - Tap the downloaded file and allow **Install from this source** when prompted by Android.

### Option B: Trusted Web Activity (TWA) via Bubblewrap (Fastest if hosted over HTTPS)
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://ainotes.your-university.edu/manifest.webmanifest
bubblewrap build
```
This outputs a signed `app-release-signed.apk` and `app-release-bundle.aab` pointing directly to your live PWA.

---

## 3. iOS & iPadOS (Direct PWA Install + Optional `.ipa` / TestFlight)

Apple does not allow arbitrary `.ipa` sideloading from websites outside the EU without an Apple Developer Enterprise Certificate or TestFlight. Therefore, **two official paths** are provided:

### Path A: Zero-Friction Direct Install via Safari PWA (Recommended for Websites)
1. Students open `https://ainotes.your-university.edu` in **Safari** on iPhone or iPad (iOS 16.4+ supports full standalone PWAs, offline Workbox caching, Apple Pencil canvas drawing, and `window.speechSynthesis` voices).
2. Tap the **Share** icon (square with upward arrow).
3. Scroll down and tap **Add to Home Screen** → **Add**.
4. AInotes launches full-screen from the Home Screen with `apple-touch-icon.png` and offline caching enabled.
5. **In-App Prompt**: AInotes automatically detects iOS Safari and displays the **Install on iOS** guide button inside the interface.

### Path B: Native `.ipa` via Capacitor + Xcode (TestFlight / Ad-Hoc / Enterprise)
1. **Add iOS platform** (requires macOS + Xcode 15+):
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   npx cap sync ios
   ```
2. **Enable Background Audio Mode** in `ios/App/App/Info.plist`:
   ```xml
   <key>UIBackgroundModes</key>
   <array>
     <string>audio</string>
   </array>
   <key>NSCameraUsageDescription</key>
   <string>AInotes uses the camera to scan handwritten lecture notes and whiteboards.</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>Used for audio study sessions and voice features.</string>
   ```
3. **Archive & Export `.ipa`**:
   ```bash
   npx cap open ios
   ```
   In Xcode: **Product → Archive → Distribute App** → choose **TestFlight / App Store Connect** (public student link via TestFlight) or **Enterprise** (direct `itms-services://` website manifest install).

---

## 4. Windows (`.exe` & `.msi` Direct Download)

Use **Tauri v2** (recommended: ~8 MB installer using Windows WebView2) or **Electron Builder**:

### Using Tauri v2
1. **Prerequisites**: Install Rust (`rustup`), Node.js 20+, and Microsoft Visual Studio C++ Build Tools.
2. **Initialize Tauri**:
   ```bash
   npm install -D @tauri-apps/cli@latest
   npx tauri init
   ```
   In `src-tauri/tauri.conf.json`:
   ```json
   {
     "productName": "AInotes",
     "version": "1.0.0",
     "identifier": "edu.cs.ainotes",
     "build": {
       "beforeBuildCommand": "npm run build",
       "frontendDist": "../dist"
     },
     "bundle": {
       "active": true,
       "targets": ["nsis", "msi"],
       "icon": ["../public/pwa-512x512.png"]
     }
   }
   ```
3. **Build `.exe` and `.msi`**:
   ```bash
   npx tauri build
   ```
   Outputs:
   - `src-tauri/target/release/bundle/nsis/AInotes_1.0.0_x64-setup.exe`
   - `src-tauri/target/release/bundle/msi/AInotes_1.0.0_x64_en-US.msi`

4. **(Optional) Code Signing** to eliminate Windows SmartScreen warnings:
   ```powershell
   signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f cert.pfx /p <PASSWORD> AInotes_1.0.0_x64-setup.exe
   ```

---

## 5. macOS (`.dmg` Universal Binary for Apple Silicon & Intel)

### Using Tauri v2 on macOS
1. **Add Universal Target**:
   ```bash
   rustup target add aarch64-apple-darwin x86_64-apple-darwin
   ```
2. **Enable Audio & Camera Entitlements** (`src-tauri/Entitlements.plist`):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>com.apple.security.device.audio-input</key><true/>
     <key>com.apple.security.device.camera</key><true/>
     <key>com.apple.security.network.client</key><true/>
   </dict>
   </plist>
   ```
3. **Build Universal `.dmg`**:
   ```bash
   npx tauri build --target universal-apple-darwin
   ```
   Output:
   - `src-tauri/target/universal-apple-darwin/release/bundle/dmg/AInotes_1.0.0_universal.dmg`

4. **Sign & Notarize for Direct Website Download**:
   ```bash
   codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Org (TEAMID)" AInotes.app
   xcrun notarytool submit AInotes_1.0.0_universal.dmg --apple-id you@edu.org --team-id TEAMID --password app-specific-pw --wait
   xcrun stapler staple AInotes_1.0.0_universal.dmg
   ```

---

## 6. Website Direct-Download Portal HTML Snippet

Upload your signed binaries to your static CDN or course server (`/downloads/`) and embed this ready-to-use section on your website:

```html
<section class="ainotes-downloads">
  <h2>Download AInotes for Your Device</h2>
  <p>Install natively or run directly in your browser as an offline-capable PWA.</p>
  <div class="download-grid">
    <a href="/downloads/AInotes-1.0.0-universal.apk" download>
      Android (.apk — Direct Install)
    </a>
    <a href="https://play.google.com/store/apps/details?id=edu.cs.ainotes">
      Android (Google Play .aab)
    </a>
    <a href="https://ainotes.your-university.edu" data-ios-pwa>
      iOS / iPadOS (Safari → Share → Add to Home Screen)
    </a>
    <a href="/downloads/AInotes_1.0.0_x64-setup.exe" download>
      Windows 10/11 (.exe Installer)
    </a>
    <a href="/downloads/AInotes_1.0.0_x64_en-US.msi" download>
      Windows Enterprise (.msi)
    </a>
    <a href="/downloads/AInotes_1.0.0_universal.dmg" download>
      macOS Universal (.dmg — Apple Silicon & Intel)
    </a>
  </div>
</section>
```

### Server MIME Headers for Direct Downloads
Ensure your web server (Nginx / Cloudflare / Express) sets proper `Content-Type` and `Content-Disposition` headers:
```nginx
location /downloads/ {
    add_header Content-Disposition "attachment";
    types {
        application/vnd.android.package-archive apk;
        application/x-msi msi;
        application/x-msdownload exe;
        application/x-apple-diskimage dmg;
    }
}
```
