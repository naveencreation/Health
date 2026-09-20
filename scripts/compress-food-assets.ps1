# Food Assets Compression Script
# Compresses images > 200KB to optimized mobile thumbnails (400x400 @ 82% quality)
# Reduces bundle size by ~90%+ with zero perceptible loss in visual quality on mobile screens.

param(
    [string]$TargetDir = "assets/foods",
    [int]$ThresholdKB = 200,
    [int]$MaxDimension = 400,
    [long]$Quality = 82
)

Add-Type -AssemblyName System.Drawing

$resolvedDir = Resolve-Path $TargetDir
if (-not (Test-Path $resolvedDir)) {
    Write-Error "Directory not found: $resolvedDir"
    exit 1
}

$files = Get-ChildItem -Path $resolvedDir -Filter "*.jpg"
$totalBefore = 0
$totalAfter = 0
$compressedCount = 0

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Calorify Food Asset Compression Optimizer" -ForegroundColor Cyan
Write-Host "  Target: $resolvedDir" -ForegroundColor Cyan
Write-Host "  Threshold: > $ThresholdKB KB | Max Size: ${MaxDimension}x${MaxDimension} | Quality: $Quality%" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Setup JPEG Encoder
$codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
$jpegCodec = $codecs | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)

foreach ($file in $files) {
    $sizeKB = [math]::Round($file.Length / 1024, 1)
    $totalBefore += $file.Length

    if ($sizeKB -gt $ThresholdKB) {
        $compressedCount++
        $srcPath = $file.FullName
        $tempPath = "$srcPath.tmp"

        try {
            $srcImage = [System.Drawing.Image]::FromFile($srcPath)
            $origWidth = $srcImage.Width
            $origHeight = $srcImage.Height

            # Calculate new dimensions keeping aspect ratio (or square crop)
            $ratio = [math]::Min($MaxDimension / $origWidth, $MaxDimension / $origHeight)
            $newWidth = [math]::Max(1, [int]($origWidth * $ratio))
            $newHeight = [math]::Max(1, [int]($origHeight * $ratio))

            # Create High-Quality Resampled Bitmap
            $destBitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
            $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            $graphics.DrawImage($srcImage, 0, 0, $newWidth, $newHeight)
            $srcImage.Dispose()
            $graphics.Dispose()

            # Save to temporary file with optimized quality
            $destBitmap.Save($tempPath, $jpegCodec, $encoderParams)
            $destBitmap.Dispose()

            # Replace original file
            Remove-Item $srcPath -Force
            Move-Item $tempPath $srcPath -Force

            $newSizeKB = [math]::Round((Get-Item $srcPath).Length / 1024, 1)
            $savedPercent = [math]::Round((1 - ($newSizeKB / $sizeKB)) * 100, 1)
            $totalAfter += (Get-Item $srcPath).Length

            Write-Host (" [OPTIMIZED] {0,-25} {1,7} KB -> {2,6} KB (-{3}%)" -f $file.Name, $sizeKB, $newSizeKB, $savedPercent) -ForegroundColor Green
        }
        catch {
            Write-Warning "Failed to compress $($file.Name): $_"
            if (Test-Path $tempPath) { Remove-Item $tempPath -Force }
            $totalAfter += $file.Length
        }
    }
    else {
        $totalAfter += $file.Length
        Write-Host (" [SKIPPED]   {0,-25} {1,7} KB (under threshold)" -f $file.Name, $sizeKB) -ForegroundColor DarkGray
    }
}

$mbBefore = [math]::Round($totalBefore / (1024 * 1024), 2)
$mbAfter = [math]::Round($totalAfter / (1024 * 1024), 2)
$mbSaved = [math]::Round(($totalBefore - $totalAfter) / (1024 * 1024), 2)
$totalSavedPercent = if ($totalBefore -gt 0) { [math]::Round((1 - ($totalAfter / $totalBefore)) * 100, 1) } else { 0 }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RESULTS:" -ForegroundColor Cyan
Write-Host "  Files Compressed: $compressedCount / $($files.Count)" -ForegroundColor White
Write-Host "  Original Bundle Size: $mbBefore MB" -ForegroundColor Yellow
Write-Host "  Optimized Bundle Size: $mbAfter MB" -ForegroundColor Green
Write-Host "  Total Space Saved: $mbSaved MB (-$totalSavedPercent%)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
