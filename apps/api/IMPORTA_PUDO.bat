@echo off
echo ========================================
echo IMPORTAZIONE PUDO - METODO DIRETTO
echo ========================================
echo.

cd /d "%~dp0"

echo Importazione dati PUDO nel database...
echo.

php -r "$db = new PDO('sqlite:database/database.sqlite'); $sql = file_get_contents('pudo_data.sql'); $db->exec($sql); $count = $db->query('SELECT COUNT(*) as c FROM pudo_points')->fetch()['c']; echo \"PUDO inseriti: $count\n\";"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESSO!
    echo ========================================
    echo.
    echo I punti PUDO sono stati inseriti.
    echo Ricarica il sito e prova a cercare PUDO.
    echo.
) else (
    echo.
    echo ========================================
    echo ERRORE
    echo ========================================
    echo.
    echo Impossibile importare i dati.
    echo Verifica che PHP sia installato.
    echo.
)

pause
