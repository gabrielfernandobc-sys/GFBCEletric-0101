@echo off
chcp 65001 > nul
title Suíte de Testes Automatizados - PRO-ELÉTRICA CAD NBR 5410
cd /d "%~dp0"
echo ==============================================================================
echo    INICIANDO SUÍTE OFICIAL DE TESTES - PRO-ELÉTRICA CAD NBR 5410
echo ==============================================================================
echo.
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 suite_testes_pro_eletrica.py
) else (
    python suite_testes_pro_eletrica.py
)
echo.
rem Testes unitários do cálculo NBR 5410 e do importador DXF (precisa do Node.js)
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo --- Testes unitarios ^(Node.js^) ---
    node --test testes/nbr5410.test.js testes/importador-dxf.test.js
) else (
    echo Node.js nao encontrado: testes unitarios ignorados.
)
echo.
echo ==============================================================================
echo    Execução finalizada. Pressione qualquer tecla para sair.
echo ==============================================================================
pause > nul
