# Pusoy Dos Solver Overlay

An Android app that provides real-time card suggestions for Pusoy Dos (Chinese Poker) using screen capture and AI-powered analysis.

## Features

- 🎯 Real-time card suggestion overlay on top of any app
- 🖱️ Draggable overlay window with tap-to-close
- 🔒 Foreground service for persistent overlay
- 📱 Material 3 design with clean UI
- 🛠️ MVVM architecture with ViewBinding

## Quick Start

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34 (compile/target), Min SDK 26

### Build

```bash
# Clone the repository
git clone <repository-url>
cd PusoyDos

# Assemble debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug

# Or install directly via ADB
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Run

1. Open the app on your device
2. Grant **"Display over other apps"** permission when prompted
3. Grant **Notification** permission (Android 13+)
4. Tap **Start Overlay** to begin
5. The suggestion overlay will appear on screen
6. Drag to reposition, tap ✕ to close

## Permissions

| Permission | Purpose |
|-----------|---------|
| `SYSTEM_ALERT_WINDOW` | Draw overlay on top of other apps |
| `FOREGROUND_SERVICE` | Run persistent background service |
| `FOREGROUND_SERVICE_MEDIA_PROJECTION` | Screen capture for card detection |
| `POST_NOTIFICATIONS` | Show foreground service notification (API 33+) |
| `INTERNET` | Potential updates/analytics |

## Architecture

```
app/src/main/java/com/pusoy/solver/
├── MainActivity.kt          # Main UI, permission checks, service control
├── OverlayService.kt        # Foreground service managing the overlay
├── PermissionManager.kt     # Centralized permission handling
└── ui/
    └── CardOverlayView.kt   # Custom draggable overlay view
```

## TODO

The following areas need implementation:

- [ ] MediaProjection screen capture setup
- [ ] OpenCV card detection from screen frames
- [ ] Pusoy Dos solver algorithm
- [ ] Dynamic suggestion updates to overlay
- [ ] Card detection visual indicators

Search for `// TODO:` comments in the codebase to find integration points.

## Project Structure

```
PusoyDos/
├── settings.gradle.kts
├── build.gradle.kts
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/pusoy/solver/
│       │   ├── MainActivity.kt
│       │   ├── OverlayService.kt
│       │   ├── PermissionManager.kt
│       │   └── ui/CardOverlayView.kt
│       └── res/
│           ├── layout/
│           │   ├── activity_main.xml
│           │   └── overlay_window.xml
│           └── values/
│               ├── strings.xml
│               ├── themes.xml
│               └── colors.xml
├── .gitignore
└── README.md
```

## License

See [LICENSE](LICENSE) for details.
