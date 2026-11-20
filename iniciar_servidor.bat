@echo off
chcp 65001 > nul
title Servidor Web - PRO-ELÉTRICA CAD NBR 5410
cd /d "%~dp0"
cls
echo ====================================================================
echo   Iniciando Servidor Web Local - PRO-ELÉTRICA CAD NBR 5410
echo ====================================================================
echo.

rem Use a variavel PY_EXE para apontar um Python especifico, se necessario:
rem   set "PY_EXE=C:\caminho\para\python.exe"
if defined PY_EXE if exist "%PY_EXE%" (
    "%PY_EXE%" servidor_local.py %*
    goto :fim
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 servidor_local.py %*
    goto :fim
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    python servidor_local.py %*
    goto :fim
)

echo [ERRO] Python nao foi encontrado.
echo Instale o Python 3 em https://www.python.org/downloads/
echo (marque a opcao "Add python.exe to PATH" durante a instalacao).

:fim
pause
