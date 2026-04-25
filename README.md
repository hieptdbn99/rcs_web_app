# RCS Worker Panel

Web app mobile-first cho cong nhan nha may goi task robot RCS bang dien thoai:

- Quet QR ma ke, vi tri lay, vi tri dich.
- Gui task dieu phoi robot.
- Gan ke vao vi tri hien tai tren RCS.
- Kiem tra trang thai task bang `robotTaskCode`.
- Co man hinh API nang cao de gui payload JSON tuy chinh.

## Yeu Cau

- Node.js 20.9 tro len.
- May chay web phai cung mang LAN/Wi-Fi voi may RCS.
- Dien thoai test QR phai cung mang voi may chay web.

## Clone Project

```powershell
git clone https://github.com/hieptdbn99/rcs_web_app.git
cd rcs_web_app
```

## Cai Dependency

Mac dinh dung npm:

```powershell
npm install
```

Neu PowerShell bao loi `npm.ps1 cannot be loaded because running scripts is disabled`, hay dung `npm.cmd` thay cho `npm`:

```powershell
npm.cmd install
```

## Cau Hinh RCS

Copy file mau:

```powershell
copy .env.example .env.local
```

Mo `.env.local` va sua IP RCS that:

```env
RCS_HOST=https://IP_MAY_RCS
APP_KEY=
APP_SECRET=
```

Ghi chu:

- Neu RCS co bat ky so/signature, dien `APP_KEY` va `APP_SECRET`.
- Neu RCS khong dung ky so, de trong `APP_KEY` va `APP_SECRET`.
- Khong commit `.env.local` len GitHub.

## Chay Tren May Tinh

```powershell
npm run dev
```

Mo trinh duyet:

```text
http://localhost:3000
```

## Chay Cho Dien Thoai Quet QR

Camera tren dien thoai thuong can HTTPS khi truy cap qua LAN, nen dung:

```powershell
npm run dev:https
```

Tim IP may dang chay web:

```powershell
ipconfig
```

Lay dia chi IPv4 cua card Wi-Fi/LAN, vi du `192.168.1.50`, roi mo tren dien thoai:

```text
https://192.168.1.50:3000
```

Neu trinh duyet bao certificate warning do cert tu ky, chon tiep tuc truy cap.

## Kiem Tra Truoc Khi Test

```powershell
npm run lint
npm run build
```

## Cac Man Hinh Chinh

- `Chay`: quet QR va gui lenh robot.
- `Gan ke`: quet QR ma ke va QR vi tri hien tai, sau do bind ke vao point tren RCS.
- `Ket qua`: query trang thai task bang `robotTaskCode`.
- `API`: gui payload JSON tuy chinh de test API RCS.

## QR Duoc Ho Tro

QR co the la text don gian:

```text
RACK_01
```

Hoac JSON:

```json
{
  "carrierCode": "RACK_01"
}
```

Hoac URL co query param:

```text
https://example.local/qr?siteCode=STATION_A
```

App se tu doc cac field thong dung:

```text
carrierCode, siteCode, robotTaskCode, code, id, value, text
```

## Script Hay Dung

```powershell
npm run dev        # Chay HTTP local
npm run dev:https  # Chay HTTPS cho dien thoai quet QR
npm run lint       # Kiem tra lint
npm run build      # Build production va tao USB_Deploy
```

Neu gap loi PowerShell `npm.ps1`, thay `npm` bang `npm.cmd` trong cac lenh tren.

## File Khong Duoc Push

Cac file/folder sau da duoc ignore:

```text
.env.local
node_modules/
.next/
USB_Deploy/
certificates/
*.pdf
*.log
```
