import os
import shutil
import urllib.request
import subprocess

def main():
    print("Bắt đầu đóng gói dự án ra USB (Post-build)...")
    
    # 2. Chuẩn bị thư mục USB_Deploy
    deploy_dir = "USB_Deploy"
    if os.path.exists(deploy_dir):
        shutil.rmtree(deploy_dir)
    os.makedirs(deploy_dir)
    
    # 3. Copy thư mục standalone ra
    standalone_dir = os.path.join(".next", "standalone")
    print(f"Copying {standalone_dir} to {deploy_dir}...")
    for item in os.listdir(standalone_dir):
        s = os.path.join(standalone_dir, item)
        d = os.path.join(deploy_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
            
    # 4. Copy các file tĩnh (Bắt buộc của Next.js standalone)
    print("Copying static files...")
    shutil.copytree(os.path.join("public"), os.path.join(deploy_dir, "public"), dirs_exist_ok=True)
    shutil.copytree(os.path.join(".next", "static"), os.path.join(deploy_dir, ".next", "static"), dirs_exist_ok=True)
    
    # Copy env file
    if os.path.exists(".env.local"):
        shutil.copy2(".env.local", os.path.join(deploy_dir, ".env.local"))
    
    # 5. Tải Node.js portable (Windows x64)
    print("Đang tải Node.js portable để chạy offline...")
    node_url = "https://nodejs.org/dist/v20.11.1/win-x64/node.exe"
    node_exe_path = os.path.join(deploy_dir, "node.exe")
    urllib.request.urlretrieve(node_url, node_exe_path)
    
    # 6. Tạo file chạy nhanh (start.bat) TỐI ƯU CHO ĐIỆN THOẠI
    print("Đang tạo file start.bat...")
    bat_content = """@echo off
cd /d "%~dp0"
echo ========================================================
echo DANG KHOI DONG HE THONG RCS CONTROL PANEL...
echo ========================================================

:: Tu dong tim dia chi IP LAN cua may tinh (Chinh xac nhat thong qua PowerShell)
set IP=
for /f "delims=" %%F in ('powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4Address.IPAddress | Select-Object -First 1"') do set IP=%%F

echo.
echo [1] De dieu khien tren may tinh nay:
echo     Truy cap: http://localhost:3000
echo.

if "%IP%"=="" goto skip_ip
set IP=%IP: =%

echo ========================================================
echo [2] DE DIEU KHIEN BANG DIEN THOAI (MOBILE MODE):
echo     B1. Dam bao dien thoai bat Wi-Fi cung mang voi nha may.
echo     B2. Mo trinh duyet Safari / Chrome tren dien thoai.
echo     B3. Truy cap chinh xac duong link sau:
echo         http://%IP%:3000
echo ========================================================
echo.

:skip_ip

:: Quan trong: Set Hostname 0.0.0.0 de cho phep mang LAN (Dien thoai) truy cap vao
set HOSTNAME=0.0.0.0
set PORT=3000

start http://localhost:3000

echo He thong dang chay... Vui long KHONG TAT cua so mau den nay!
node.exe server.js
pause
"""
    with open(os.path.join(deploy_dir, "start.bat"), "w", encoding="utf-8") as f:
        f.write(bat_content)
        
    print("Hoàn tất! Cập nhật kịch bản USB thành công.")

if __name__ == "__main__":
    main()
