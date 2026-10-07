$env:JAVA_HOME = "$PSScriptRoot\.jdk21\jdk-21.0.5+11"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
Write-Host "Using JAVA_HOME: $env:JAVA_HOME"
Set-Location $PSScriptRoot
& ".\gradlew.bat" --stop
& ".\gradlew.bat" assembleDebug
