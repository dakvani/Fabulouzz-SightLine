Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batchPath = fso.BuildPath(scriptDir, "start-sightline.bat")

Set WshShell = CreateObject("WScript.Shell")
' Run batch file hidden (0) and without waiting (False)
WshShell.Run """" & batchPath & """", 0, False
