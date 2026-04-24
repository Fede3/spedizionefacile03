@echo off
setlocal EnableExtensions

call "%~dp0claude-recover.cmd"
exit /b %ERRORLEVEL%
