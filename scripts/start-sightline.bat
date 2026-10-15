@echo off
title Fabulouzz SightLine Service
cd /d "%~dp0\.."
echo [SightLine] Starting Fabulouzz SightLine on port 8080...
npm run dev
