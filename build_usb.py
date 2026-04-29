import os
import shutil
import urllib.request
import sys


def env_flag(name):
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "y")

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

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
    
    # Copy env file only when explicitly requested, to avoid leaking keys/secrets to USB output.
    if env_flag("USB_COPY_ENV") and os.path.exists(".env.local"):
        shutil.copy2(".env.local", os.path.join(deploy_dir, ".env.local"))
        print("Copied .env.local because USB_COPY_ENV=true.")
    elif os.path.exists(".env.example"):
        shutil.copy2(".env.example", os.path.join(deploy_dir, ".env.example"))
        print("Skipped .env.local. Configure env on the target machine or build with USB_COPY_ENV=true.")

    # Copy HTTPS certificates if available. The generated start.bat will run an HTTPS proxy for phone QR scanning.
    certificate_dir = "certificates"
    certificate_key = os.path.join(certificate_dir, "localhost-key.pem")
    certificate_cert = os.path.join(certificate_dir, "localhost.pem")
    if os.path.exists(certificate_key) and os.path.exists(certificate_cert):
        shutil.copytree(certificate_dir, os.path.join(deploy_dir, certificate_dir), dirs_exist_ok=True)
        print("Copied certificates for HTTPS mobile proxy.")
    else:
        print("No certificates found. USB package will still run over HTTP, but phone camera QR may be blocked.")
    
    # 5. Tải Node.js portable (Windows x64)
    print("Đang tải Node.js portable để chạy offline...")
    node_url = "https://nodejs.org/dist/v20.11.1/win-x64/node.exe"
    node_exe_path = os.path.join(deploy_dir, "node.exe")
    urllib.request.urlretrieve(node_url, node_exe_path)

    # HTTPS proxy for production standalone server. Next standalone server itself listens over HTTP.
    https_proxy_content = """const fs = require('fs');
const http = require('http');
const https = require('https');

const targetPort = Number(process.env.TARGET_PORT || process.env.PORT || 3000);
const httpsPort = Number(process.env.HTTPS_PORT || 3443);

const options = {
  key: fs.readFileSync('certificates/localhost-key.pem'),
  cert: fs.readFileSync('certificates/localhost.pem'),
};

const server = https.createServer(options, (req, res) => {
  const headers = {
    ...req.headers,
    host: `127.0.0.1:${targetPort}`,
    'x-forwarded-proto': 'https',
  };

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`HTTPS proxy error: ${error.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(httpsPort, '0.0.0.0', () => {
  console.log(`RCS HTTPS proxy listening on https://0.0.0.0:${httpsPort}`);
});
"""
    with open(os.path.join(deploy_dir, "https-proxy.js"), "w", encoding="utf-8") as f:
        f.write(https_proxy_content)
    
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
echo     B3. Uu tien link HTTPS de quet QR bang camera:
echo         https://%IP%:3443
echo     Neu khong co certificate, chi con link HTTP:
echo         http://%IP%:3000
echo ========================================================
echo.

:skip_ip

:: Quan trong: Set Hostname 0.0.0.0 de cho phep mang LAN (Dien thoai) truy cap vao
set HOSTNAME=0.0.0.0
set PORT=3000
set TARGET_PORT=3000
set HTTPS_PORT=3443

if exist "certificates\\localhost-key.pem" if exist "certificates\\localhost.pem" (
  echo Dang khoi dong HTTPS proxy cho dien thoai quet QR...
  if not "%IP%"=="" echo     Mobile HTTPS: https://%IP%:%HTTPS_PORT%
  start "RCS HTTPS Proxy" /min node.exe https-proxy.js
  start https://localhost:%HTTPS_PORT%
) else (
  echo Khong tim thay certificate. Camera tren dien thoai co the bi chan neu dung HTTP.
  start http://localhost:3000
)

echo He thong dang chay... Vui long KHONG TAT cua so mau den nay!
node.exe server.js
pause
"""
    with open(os.path.join(deploy_dir, "start.bat"), "w", encoding="utf-8") as f:
        f.write(bat_content)
        
    print("Hoàn tất! Cập nhật kịch bản USB thành công.")

if __name__ == "__main__":
    main()
