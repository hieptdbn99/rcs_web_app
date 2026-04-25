# RCS Worker Panel

Web app mobile-first cho cong nhan nha may goi task robot RCS bang dien thoai:

- Quet QR ma ke, vi tri lay, vi tri dich.
- Gui task dieu phoi robot.
- Gan ke vao vi tri hien tai tren RCS.
- Kiem tra trang thai task bang `robotTaskCode`.
- Co API Console tren nhanh `dev`, gom cac API RCS theo nhom Task, Ke/Point, Khu vuc, Trang thai, Tich hop/Callback.

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

- `Nhanh`: quet QR, gui lenh robot, gan ke va tra cuu task.
- `Task workflow`: group task, apply task, continue, cancel, priority, pretask va custom API.
- `Ke, carrier, point`: bind/unbind, lock/unlock carrier va point.
- `Khu vuc`: pause/restore, homing, clear area, block/release area.
- `Trang thai`: query task, robot va carrier.
- `Tich hop va callback`: notify thiet bi ben thu ba va cac endpoint RCS goi nguoc ve web.

## API Console Tren Nhanh Dev

Nhanh `dev` co route dong de goi cac API outbound sang RCS:

```text
POST /api/rcs/actions/[apiId]
```

Body:

```json
{
  "payload": {
    "robotTaskCode": "TASK_001"
  }
}
```

Vi du:

```text
POST /api/rcs/actions/task-query
POST /api/rcs/actions/task-submit
POST /api/rcs/actions/site-bind
POST /api/rcs/actions/zone-pause
```

Nhanh `dev` cung co endpoint callback de RCS goi nguoc:

```text
POST /api/robot/reporter/task
POST /api/robot/reporter/zone
POST /api/robot/reporter/resource
POST /api/robot/reporter/eqpt
POST /api/robot/reporter/zone/homing
POST /api/robot/reporter/zone/banish
POST /api/robot/reporter/robot/warning
POST /api/robot/reporter/task/warning
```

Luu y: cac callback dang tra ve `SUCCESS` mac dinh va log payload ra server. Neu RCS can logic WMS that, can bo sung xu ly nghiep vu sau.

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
