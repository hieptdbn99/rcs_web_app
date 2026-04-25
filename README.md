# RCS Worker Panel

Web app mobile-first cho công nhân nhà máy gọi task robot RCS bằng điện thoại:

- Quét QR mã kệ, vị trí lấy, vị trí đích.
- Gửi task điều phối robot.
- Gắn kệ vào vị trí hiện tại trên RCS.
- Kiểm tra trạng thái task bằng `robotTaskCode`.
- Có API Console trên nhánh `dev`, gom các API RCS theo nhóm Task, Kệ/Point, Khu vực, Trạng thái, Tích hợp/Callback.

## Yêu Cầu

- Node.js 20.9 trở lên.
- Máy chạy web phải cùng mạng LAN/Wi-Fi với máy RCS.
- Điện thoại test QR phải cùng mạng với máy chạy web.

## Clone Project

```powershell
git clone https://github.com/hieptdbn99/rcs_web_app.git
cd rcs_web_app
```

## Cài Dependency

Mặc định dùng npm:

```powershell
npm install
```

Nếu PowerShell báo lỗi `npm.ps1 cannot be loaded because running scripts is disabled`, hãy dùng `npm.cmd` thay cho `npm`:

```powershell
npm.cmd install
```

## Cấu Hình RCS

Copy file mẫu:

```powershell
copy .env.example .env.local
```

Mở `.env.local` và sửa IP RCS thật:

```env
RCS_HOST=https://IP_MAY_RCS
APP_KEY=
APP_SECRET=
```

Ghi chú:

- Nếu RCS có bật ký số/signature, điền `APP_KEY` và `APP_SECRET`.
- Nếu RCS không dùng ký số, để trống `APP_KEY` và `APP_SECRET`.
- Không commit `.env.local` lên GitHub.

## Chạy Trên Máy Tính

```powershell
npm run dev
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Chạy Cho Điện Thoại Quét QR

Camera trên điện thoại thường cần HTTPS khi truy cập qua LAN, nên dùng:

```powershell
npm run dev:https
```

Tìm IP máy đang chạy web:

```powershell
ipconfig
```

Lấy địa chỉ IPv4 của card Wi-Fi/LAN, ví dụ `192.168.1.50`, rồi mở trên điện thoại:

```text
https://192.168.1.50:3000
```

Nếu trình duyệt báo certificate warning do cert tự ký, chọn tiếp tục truy cập.

## Kiểm Tra Trước Khi Test

```powershell
npm run lint
npm run build
```

## Các Màn Hình Chính

- `Nhanh`: quét QR, gửi lệnh robot, gắn kệ và tra cứu task.
- `Task workflow`: group task, apply task, continue, cancel, priority, pretask và custom API.
- `Kệ, carrier, point`: bind/unbind, lock/unlock carrier và point.
- `Khu vực`: pause/restore, homing, clear area, block/release area.
- `Trạng thái`: query task, robot và carrier.
- `Tích hợp và callback`: notify thiết bị bên thứ ba và các endpoint RCS gọi ngược về web.

## API Console Trên Nhánh Dev

Nhánh `dev` có API Console dạng form để người không biết code vẫn nhập được bằng ô input, dropdown và nút quét QR. JSON nâng cao vẫn có nhưng được đặt trong phần dành cho kỹ thuật.

Route động để gọi các API outbound sang RCS:

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

Ví dụ:

```text
POST /api/rcs/actions/task-query
POST /api/rcs/actions/task-submit
POST /api/rcs/actions/site-bind
POST /api/rcs/actions/zone-pause
```

Nhánh `dev` cũng có endpoint callback để RCS gọi ngược:

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

Lưu ý: các callback đang trả về `SUCCESS` mặc định và log payload ra server. Nếu RCS cần logic WMS thật, cần bổ sung xử lý nghiệp vụ sau.

## QR Được Hỗ Trợ

QR có thể là text đơn giản:

```text
RACK_01
```

Hoặc JSON:

```json
{
  "carrierCode": "RACK_01"
}
```

Hoặc URL có query param:

```text
https://example.local/qr?siteCode=STATION_A
```

App sẽ tự đọc các field thông dụng:

```text
carrierCode, siteCode, robotTaskCode, singleRobotCode, zoneCode, code, id, value, text
```

## Script Hay Dùng

```powershell
npm run dev        # Chạy HTTP local
npm run dev:https  # Chạy HTTPS cho điện thoại quét QR
npm run lint       # Kiểm tra lint
npm run build      # Build production và tạo USB_Deploy
```

Nếu gặp lỗi PowerShell `npm.ps1`, thay `npm` bằng `npm.cmd` trong các lệnh trên.

## File Không Được Push

Các file/folder sau đã được ignore:

```text
.env.local
node_modules/
.next/
USB_Deploy/
certificates/
*.pdf
*.log
```
