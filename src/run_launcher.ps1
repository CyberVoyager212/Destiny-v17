# run_launcher_autorestart_fixed.ps1
# Simple launcher: only auto-restart when cmd exits. ASCII turkce (no non-ascii chars).
$ErrorActionPreference = 'Stop'

# settings
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -LiteralPath $root

$cmdPidPath  = Join-Path $root 'cmd.pid'
$watchIntervalMs = 500
$maxStopWaitSec  = 8

# helpers
function Write-Pid([string]$path, [int]$id) {
    try { $id | Out-File -FilePath $path -Encoding ascii -Force -ErrorAction Stop }
    catch { Write-Warning "PID file yazilamadi: $path - $_" }
}
function Remove-Pid([string]$path) {
    try { Remove-Item $path -ErrorAction SilentlyContinue } catch {}
}
function Get-ProcessSafe([int]$id) {
    try { return Get-Process -Id $id -ErrorAction Stop } catch { return $null }
}

# start cmd that runs node index.js
function Start-CmdNode {
    param([string]$workDir, [string]$nodeArgs = "index.js")
    try {
        $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c node $nodeArgs" -WorkingDirectory $workDir -PassThru -WindowStyle Normal -ErrorAction Stop
        Write-Pid -path $cmdPidPath -id $proc.Id
        Write-Host "Started cmd (PID $($proc.Id))"
        return $proc
    } catch {
        Write-Warning "cmd baslatilamadi: $_"
        return $null
    }
}

# simple UI without inline-if
function Render-UI {
    param([System.Diagnostics.Process]$proc, [datetime]$startTime, [string]$lastAction, [datetime]$lastEventTime, [string]$statusMsg)
    Clear-Host
    $cols = [Console]::WindowWidth
    if ($cols -lt 40) { $cols = 40 }
    Write-Host ("=" * ($cols - 1))
    Write-Host "  DESTINY LAUNCHER - AUTORESTART  "
    Write-Host ("=" * ($cols - 1))
    Write-Host ""

    $running = $false
    $procIdDisplay = '-'
    if ($proc -and (Get-ProcessSafe -id $proc.Id)) {
        $running = $true
        $procIdDisplay = $proc.Id
    }

    $uptime = (Get-Date) - $startTime
    $uptimeStr = $uptime.ToString('dd\.hh\:mm\:ss')

    if ($running) { $statusText = "RUNNING" } else { $statusText = "STOPPED" }

    Write-Host ("Status       : " + $statusText)
    Write-Host ("Cmd PID      : " + $procIdDisplay)
    Write-Host ("Launcher PID : " + $PID)
    Write-Host ("Uptime       : " + $uptimeStr)
    Write-Host ("Last event   : " + $lastAction + " @ " + ($lastEventTime.ToString('yyyy-MM-dd HH:mm:ss')))
    if ($statusMsg) { Write-Host ("Message      : " + $statusMsg) }
    Write-Host ""
    Write-Host ""
    Write-Host ("-" * ([Math]::Min(80, $cols - 1)))
    Write-Host ""
}

# init state
$StartTime = Get-Date
$LastAction = "Launcher started"
$LastEventTime = Get-Date
$StatusMessage = ""

# try claim existing pid
$existingPid = $null
if (Test-Path $cmdPidPath) {
    try { $existingPid = [int](Get-Content $cmdPidPath -ErrorAction SilentlyContinue) } catch { $existingPid = $null }
}

$cmdProc = $null
if ($existingPid -and (Get-ProcessSafe -id $existingPid)) {
    try {
        $cmdProc = Get-Process -Id $existingPid -ErrorAction Stop
        $StatusMessage = "Existing cmd claimed."
    } catch { $cmdProc = $null }
}

# if none, start
if (-not $cmdProc) {
    $cmdProc = Start-CmdNode -workDir $root
    if ($cmdProc) { $LastAction = "Node baslatildi (PID $($cmdProc.Id))"; $LastEventTime = Get-Date }
}

# main loop: only restart when cmd exits
while ($true) {
    try {
        Render-UI -proc $cmdProc -startTime $StartTime -lastAction $LastAction -lastEventTime $LastEventTime -statusMsg $StatusMessage

        # if cmd exited, restart it
        if (-not $cmdProc -or -not (Get-ProcessSafe -id $cmdProc.Id)) {
            $LastAction = "cmd not running, starting new cmd"
            $LastEventTime = Get-Date
            Remove-Pid $cmdPidPath
            $StatusMessage = "Restarting cmd because it exited."
            $cmdProc = Start-CmdNode -workDir $root
            if ($cmdProc) {
                $LastAction = "Node started (PID $($cmdProc.Id))"
                $LastEventTime = Get-Date
                $StatusMessage = "Node baslatildi."
            } else {
                $StatusMessage = "Node baslatilamadi; tekrar deneniyor."
            }
        }
    } catch {
        Write-Warning "Loop error: $_"
        $StatusMessage = "Error: $($_.Exception.Message)"
    }

    Start-Sleep -Milliseconds $watchIntervalMs
}
