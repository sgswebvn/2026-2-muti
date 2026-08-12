@echo off
title Facebook Multi-Publisher All-in-One
cls
echo ====================================================================
echo 🚀 KHOI CHAY FACEBOOK MULTI-PUBLISHER ALL-IN-ONE SYSTEM (MONGODB CLOUD)
echo ====================================================================
echo.
echo [1/2] Dang bien dich Frontend Assets (Vite Production Build)...
call npm run build
echo.
echo [2/2] Dang khoi chay Server Express, Cron Worker va Auto-Open Trinh Duyet...
start http://localhost:5000
node server/index.js
pause
