import React, { useState } from 'react';
import { Download, Laptop, Smartphone, Tablet, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'windows' | 'macos'>(
    isIOS ? 'ios' : 'android'
  );

  if (!isOpen) return null;

  const platformDetails: Record<
    'android' | 'ios' | 'windows' | 'macos',
    { title: string; artifact: string; steps: string[] }
  > = {
    android: {
      title: 'Android (.apk / .aab & TWA)',
      artifact: 'AInotes-1.0.0-universal.apk / Play Store .aab',
      steps: [
        'Direct Website APK: Package dist/ with Capacitor (`npx cap add android && ./gradlew assembleRelease`) or Bubblewrap TWA (`bubblewrap build`).',
        'Audio Permissions: AndroidManifest.xml enables WAKE_LOCK, FOREGROUND_SERVICE_MEDIA_PLAYBACK, and MODIFY_AUDIO_SETTINGS for background TTS playback.',
        'Student Install: Host the signed .apk at `/downloads/AInotes-universal.apk` with MIME type `application/vnd.android.package-archive`.',
      ],
    },
    ios: {
      title: 'iOS & iPadOS (Safari PWA / TestFlight .ipa)',
      artifact: 'Safari Home Screen PWA or TestFlight .ipa',
      steps: [
        'Direct Website PWA: Open AInotes in Safari on iOS/iPadOS -> tap the Share button -> tap "Add to Home Screen". Works offline with Apple Pencil stylus input.',
        'Native .ipa Distribution: Wrap with Capacitor iOS (`npx cap add ios`), enable `UIBackgroundModes: audio` in Info.plist, and distribute via TestFlight public link or Enterprise manifest.',
      ],
    },
    windows: {
      title: 'Windows 10 / 11 (.exe & .msi)',
      artifact: 'AInotes_x64-setup.exe / AInotes_x64.msi',
      steps: [
        'Build with Tauri v2 (`npx tauri build`) targeting both `nsis` (.exe) and `msi` (.msi) installers using WebView2.',
        'Sign executables with `signtool.exe` (SHA-256) and host on your course portal for 1-click download.',
      ],
    },
    macos: {
      title: 'macOS Universal (.dmg)',
      artifact: 'AInotes_universal.dmg (Apple Silicon + Intel)',
      steps: [
        'Build universal binary (`npx tauri build --target universal-apple-darwin`) bundling arm64 + x86_64.',
        'Enable `com.apple.security.device.audio-input` and `camera` entitlements, codesign, notarize with `xcrun notarytool`, and serve `.dmg` with `Content-Disposition: attachment`.',
      ],
    },
  };

  const activeInfo = platformDetails[selectedPlatform];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="install-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
              Install & Distribute AInotes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Progressive Web App + Native Installer Blueprints (see INSTALLATION.md)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Live Browser / Device PWA Install Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Instant PWA Installation (Offline & Background Audio Ready)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {isInstalled
                  ? 'AInotes is currently running in standalone installed mode.'
                  : isInstallable
                  ? 'Your browser supports 1-click native PWA installation right now.'
                  : isIOS
                  ? 'On iPhone/iPad: Tap Share in Safari, then choose "Add to Home Screen".'
                  : 'Use your browser address-bar Install icon or package native binaries below.'}
              </p>
            </div>
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Install App Now
              </button>
            )}
          </div>

          {/* Native Platform Distribution Tabs */}
          <div>
            <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 mb-4">
              {(
                [
                  { id: 'android', label: 'Android APK/AAB', icon: Smartphone },
                  { id: 'ios', label: 'iOS PWA / IPA', icon: Tablet },
                  { id: 'windows', label: 'Windows .exe/.msi', icon: Laptop },
                  { id: 'macos', label: 'macOS .dmg', icon: Laptop },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedPlatform(id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selectedPlatform === id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activeInfo.title}
                </h3>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {activeInfo.artifact}
                </span>
              </div>
              <ol className="list-decimal ps-5 space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {activeInfo.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
