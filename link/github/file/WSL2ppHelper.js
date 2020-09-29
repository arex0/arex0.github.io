var wshShell = new ActiveXObject("WScript.Shell");
wshShell.Run('%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -ExecutionPolicy Bypass -File "%SystemRoot%\\WSL2PortProxy.ps1"', 0, false);
