#!/bin/bash
# Android APK Build Script
# Quick build script for Sunpizza App

echo "========================================="
echo "  Android APK Build Script"
echo "  Sunpizza App v1.0.0"
echo "========================================="
echo ""

# Step 1: Clean
echo "[1/4] Cleaning previous build..."
flutter clean
echo "✓ Clean complete!"
echo ""

# Step 2: Get dependencies
echo "[2/4] Getting dependencies..."
flutter pub get
echo "✓ Dependencies updated!"
echo ""

# Step 3: Build APK
echo "[3/4] Building APK..."
echo "This may take a few minutes..."
flutter build apk --release

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

echo "✓ APK build complete!"
echo ""

# Step 4: Show output
echo "[4/4] Build complete!"
echo ""
echo "========================================="
echo "  ✓ Build Successful!"
echo "========================================="
echo ""

APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
if [ -f "$APK_PATH" ]; then
    FILE_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "APK Location:"
    echo "$APK_PATH"
    echo ""
    echo "File Size: $FILE_SIZE"
    echo ""
    
    echo "You can install this APK on Android devices."
    echo ""
    
    # Open folder (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Opening output folder..."
        open "build/app/outputs/flutter-apk/"
    fi
else
    echo "❌ APK file not found!"
fi

echo ""

