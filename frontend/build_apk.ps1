# Android APK Build Script
# Quick build script for Sunpizza App

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Android APK Build Script" -ForegroundColor Cyan
Write-Host "  Sunpizza App v1.0.0" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean
Write-Host "[1/4] Cleaning previous build..." -ForegroundColor Yellow
flutter clean
Write-Host "Clean complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Get dependencies
Write-Host "[2/4] Getting dependencies..." -ForegroundColor Yellow
flutter pub get
Write-Host "Dependencies updated!" -ForegroundColor Green
Write-Host ""

# Step 3: Build APK
Write-Host "[3/4] Building APK..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
flutter build apk --release

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "APK build complete!" -ForegroundColor Green
Write-Host ""

# Step 4: Show output
Write-Host "[4/4] Build complete!" -ForegroundColor Yellow
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Build Successful!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$apkPath = "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkPath) {
    $fileSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "APK Location:" -ForegroundColor Cyan
    Write-Host $apkPath -ForegroundColor White
    Write-Host ""
    Write-Host "File Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "You can install this APK on Android devices." -ForegroundColor Yellow
    Write-Host ""
    
    # Open folder
    Write-Host "Opening output folder..." -ForegroundColor Gray
    explorer.exe "build\app\outputs\flutter-apk\"
} else {
    Write-Host "APK file not found!" -ForegroundColor Red
}

Write-Host ""

