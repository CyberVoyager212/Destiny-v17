@echo off
REM 1) src klasöründe npm install
echo src klasorunde paketler kuruluyor...
if exist src (
    pushd src
    start /wait cmd /c "npm install"
    popd
) else (
    echo src klasoru bulunamadi.
)

REM 2) Ana klasorde paketleri kur
echo Ana klasorde paketler kuruluyor...
start /wait cmd /c "npm install discord.js better-sqlite3 quick.db"

REM 3) kurulum.js çalıştır
if exist kurulum.js (
    echo kurulum.js calistiriliyor...
    start /wait cmd /c "node kurulum.js"
) else (
    echo kurulum.js bulunamadi.
)

REM 4) kurulum2.js çalıştır
if exist kurulum2.js (
    echo kurulum2.js calistiriliyor...
    start /wait cmd /c "node kurulum2.js"
) else (
    echo kurulum2.js bulunamadi.
)

REM 5) Paketleri kaldır
echo Paketler kaldiriliyor...
start /wait cmd /c "npm uninstall discord.js better-sqlite3 quick.db"

echo Tum islemler tamamlandi. Hatalar varsa yukarida gorunur.
pause
