Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd /c taskkill /f /im node.exe >nul 2>&1", 0, True
objShell.Run "cmd /k cd /d ""C:\Users\Administrator\Desktop\电力宝可梦\Claude\Claude\Electric-humen\powerlink-v2"" && npm run dev", 1, False
WScript.Sleep 3000
objShell.Run "http://localhost:3000"
