$jdkUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_windows_hotspot_21.0.5_11.zip"
$zipPath = "$PSScriptRoot\jdk21.zip"
$outPath = "$PSScriptRoot\.jdk21"
if (!(Test-Path "$outPath\bin\java.exe")) {
    Write-Host "Downloading JDK 21..."
    Invoke-WebRequest -Uri $jdkUrl -OutFile $zipPath
    Write-Host "Extracting JDK 21..."
    Expand-Archive -Path $zipPath -DestinationPath $outPath -Force
    Remove-Item $zipPath
} else {
    Write-Host "JDK 21 already cached."
}
