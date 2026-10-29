@echo off
rem Chạy luồng AI trên thư mục samples (hoặc thư mục truyền vào): run_pipeline.bat [thu_muc]
cd /d %~dp0
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
if not exist .venv (
  python -m venv .venv
  .venv\Scripts\python -m pip install -r requirements.txt
)
if "%~1"=="" (
  .venv\Scripts\python scripts\run_pipeline.py samples
) else (
  .venv\Scripts\python scripts\run_pipeline.py %*
)
