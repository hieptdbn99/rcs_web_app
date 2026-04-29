import React from "react";
import {
  Blocks,
  ClipboardList,
  Map,
  Package,
  Play,
  RotateCw,
} from "lucide-react";
import type { ApiFormSchema, MainTab, QuickScanTarget, ScanTarget } from "@/lib/rcsTypes";

// ─── Quick-scan labels ────────────────────────────────────────────────────────

export const quickScanLabels: Record<QuickScanTarget, string> = {
  carrier: "Quét QR mã kệ",
  source: "Quét QR vị trí lấy",
  destination: "Quét QR vị trí đích",
  bindCarrier: "Quét QR mã kệ cần gắn",
  bindSite: "Quét QR vị trí hiện tại",
  statusTask: "Quét QR mã task",
};

export function getScanLabel(target: ScanTarget): string {
  if (typeof target === "string") return quickScanLabels[target];
  return `Quét QR cho ${target.label}`;
}

// ─── Tab icons ────────────────────────────────────────────────────────────────

export const groupIcons: Record<MainTab, React.ReactNode> = {
  quick: <Play className="h-4 w-4" />,
  task: <ClipboardList className="h-4 w-4" />,
  asset: <Package className="h-4 w-4" />,
  area: <Map className="h-4 w-4" />,
  status: <RotateCw className="h-4 w-4" />,
  integration: <Blocks className="h-4 w-4" />,
};

// ─── Shared select options ────────────────────────────────────────────────────

export const fieldOptions = {
  targetType: [
    { label: "Kệ / Carrier", value: "CARRIER" },
    { label: "Vị trí / Site", value: "SITE" },
    { label: "Khu vực / Zone", value: "ZONE" },
    { label: "Ô lưu trữ / Storage", value: "STORAGE" },
  ],
  operation: [
    { label: "Không chọn", value: "" },
    { label: "Lấy hàng", value: "COLLECT" },
    { label: "Giao hàng", value: "DELIVERY" },
    { label: "Xoay", value: "ROTATE" },
  ],
  yesNo: [
    { label: "Có", value: "YES" },
    { label: "Không", value: "NO" },
  ],
  carrierDir: [
    { label: "0 độ", value: "0" },
    { label: "90 độ", value: "90" },
    { label: "180 độ", value: "180" },
    { label: "-90 độ", value: "-90" },
    { label: "360 độ", value: "360" },
  ],
} as const;

// ─── API Form Schemas ─────────────────────────────────────────────────────────

export const API_FORM_SCHEMAS: Record<string, ApiFormSchema> = {
  "task-group": {
    summary: "Dùng khi cần gom nhiều task vào cùng một nhóm chạy theo thứ tự.",
    fields: [
      { name: "groupCode", label: "Mã nhóm task", qr: true },
      { name: "strategy", label: "Chiến lược", type: "select", options: [{ label: "Chạy theo thứ tự nhóm", value: "GROUP_SEQ" }, { label: "Phân bổ theo nhóm", value: "GROUP_ASSIGN" }] },
      { name: "strategyValue", label: "Giá trị chiến lược", type: "select", options: [{ label: "Ordered within and between groups", value: "1" }, { label: "Unordered between groups", value: "0" }, { label: "Ordered between groups", value: "2" }, { label: "Ordered within groups", value: "3" }] },
      { name: "groupSeq", label: "Thứ tự nhóm", type: "number" },
      { name: "targetType", label: "Loại điểm điều phối", type: "select", options: fieldOptions.targetType },
      { name: "targetCode", label: "Mã điểm điều phối", qr: true },
      { name: "robotTaskCode", label: "Mã task ngoài", qr: true },
      { name: "sequence", label: "Thứ tự task", type: "number" },
    ],
  },
  "task-submit": {
    summary: "Tạo task robot. Người vận hành thường chỉ cần chọn loại điểm và nhập/quét mã.",
    fields: [
      { name: "taskType", label: "Loại task", placeholder: "PF-LMR-COMMON" },
      { name: "startType", label: "Loại điểm lấy", type: "select", options: fieldOptions.targetType },
      { name: "startCode", label: "Mã điểm lấy / mã kệ", qr: true },
      { name: "destType", label: "Loại điểm đích", type: "select", options: fieldOptions.targetType },
      { name: "destCode", label: "Mã điểm đích", qr: true },
      { name: "destOperation", label: "Hành động tại đích", type: "select", options: fieldOptions.operation },
      { name: "initPriority", label: "Ưu tiên", type: "number" },
      { name: "interrupt", label: "Cho phép ngắt task", type: "select", options: [{ label: "Không", value: "0" }, { label: "Có", value: "1" }] },
      { name: "carrierType", label: "Loại kệ", helper: "Chỉ cần khi task yêu cầu carrierInfo." },
    ],
  },
  "task-continue": {
    summary: "Cho task nhiều bước chạy tiếp bước kế tiếp.",
    fields: [
      { name: "robotTaskCode", label: "Mã task", qr: true },
      { name: "triggerType", label: "Loại trigger", type: "select", options: [{ label: "Theo task", value: "TASK" }, { label: "Theo vị trí", value: "SITE" }, { label: "Theo kệ", value: "CARRIER" }, { label: "Theo robot", value: "ROBOT" }] },
      { name: "triggerCode", label: "Mã trigger", qr: true },
      { name: "nextSeq", label: "Seq tiếp theo", type: "number" },
      { name: "targetType", label: "Loại điểm tiếp theo", type: "select", options: fieldOptions.targetType },
      { name: "targetCode", label: "Mã điểm tiếp theo", qr: true },
      { name: "autoStart", label: "Tự chạy bước này", type: "select", options: [{ label: "Có", value: "1" }, { label: "Không", value: "0" }] },
      { name: "operation", label: "Hành động", type: "select", options: fieldOptions.operation },
    ],
  },
  "task-cancel": {
    summary: "Hủy task. Chỉ dùng khi chắc chắn task cần dừng.",
    fields: [
      { name: "robotTaskCode", label: "Mã task cần hủy", qr: true },
      { name: "cancelType", label: "Kiểu hủy", type: "select", options: [{ label: "Hủy mềm", value: "CANCEL" }, { label: "Can thiệp thủ công", value: "DROP" }] },
      { name: "carrierCode", label: "Mã kệ liên quan", qr: true },
      { name: "reason", label: "Lý do hủy", wide: true },
    ],
  },
  "task-priority": {
    summary: "Đổi độ ưu tiên task trước khi task kết thúc.",
    fields: [
      { name: "robotTaskCode", label: "Mã task", qr: true },
      { name: "initPriority", label: "Ưu tiên mới", type: "number", helper: "1 đến 120, số lớn ưu tiên cao hơn." },
      { name: "deadline", label: "Deadline", placeholder: "2030-01-01T12:30:00Z", wide: true },
    ],
  },
  "task-pretask": {
    summary: "Gọi robot tới trước một vị trí để chuẩn bị task sắp phát sinh.",
    fields: [
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "nextTaskTime", label: "Thời gian dự kiến tạo task (giây)", type: "number" },
      { name: "robotType", label: "Loại robot" },
      { name: "priority", label: "Ưu tiên", type: "number" },
      { name: "taskCount", label: "Số task dự kiến", type: "number" },
      { name: "capacityCount", label: "Số ô trống tối thiểu", type: "number" },
      { name: "amrDir", label: "Hướng robot", type: "select", options: [{ label: "Không chỉ định", value: "999" }, { label: "0 độ", value: "0" }, { label: "90 độ", value: "90" }, { label: "180 độ", value: "180" }, { label: "-90 độ", value: "-90" }] },
    ],
  },
  "custom-normal": {
    summary: "API tùy chỉnh cho CHECK hoặc FULL_NOTIFY. Chỉ dùng khi kỹ thuật đã thống nhất payload.",
    fields: [
      { name: "taskCode", label: "Mã task", qr: true },
      { name: "notifyType", label: "Loại thông báo", type: "select", options: [{ label: "Kiểm tra cho phép vào", value: "CHECK" }, { label: "Báo đã đầy", value: "FULL_NOTIFY" }] },
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "carrierType", label: "Loại kệ" },
      { name: "layer", label: "Tầng", type: "number" },
      { name: "siteInfo", label: "Danh sách điểm", placeholder: "SITE_A,SITE_B", wide: true },
      { name: "result", label: "Kết quả CHECK", type: "select", options: [{ label: "Cho phép", value: "1" }, { label: "Không cho phép", value: "0" }] },
    ],
  },
  "carrier-bind": {
    summary: "Gắn carrier/kệ vào point.",
    fields: [
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "carrierDir", label: "Góc kệ", type: "select", options: fieldOptions.carrierDir },
    ],
  },
  "carrier-unbind": {
    summary: "Bỏ liên kết carrier/kệ khỏi point.",
    fields: [
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "siteCode", label: "Mã vị trí", qr: true },
    ],
  },
  "site-bind": {
    summary: "Gắn hoặc bỏ gắn storage object/point với carrier. Đây là luồng gắn kệ chính.",
    fields: [
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Gắn", value: "BIND" }, { label: "Bỏ gắn", value: "UNBIND" }] },
      { name: "slotCategory", label: "Loại vị trí", type: "select", options: [{ label: "Point/Site", value: "SITE" }, { label: "Bin", value: "BIN" }] },
      { name: "slotCode", label: "Mã vị trí", qr: true },
      { name: "carrierCategory", label: "Loại carrier", type: "select", options: [{ label: "Rack/POD", value: "POD" }, { label: "Pallet", value: "PALLET" }, { label: "Box", value: "BOX" }, { label: "Material", value: "MAT" }] },
      { name: "carrierType", label: "Kiểu kệ" },
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "carrierDir", label: "Góc kệ", type: "select", options: fieldOptions.carrierDir },
      { name: "temporary", label: "Kệ tạm", type: "select", options: [{ label: "Không", value: "0" }, { label: "Có", value: "1" }] },
    ],
  },
  "carrier-lock": {
    summary: "Khóa hoặc mở khóa kệ/carrier.",
    fields: [
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Khóa", value: "LOCK" }, { label: "Mở khóa", value: "UNLOCK" }] },
    ],
  },
  "site-lock": {
    summary: "Khóa hoặc mở khóa point/vị trí.",
    fields: [
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Khóa", value: "LOCK" }, { label: "Mở khóa", value: "UNLOCK" }] },
    ],
  },
  "zone-pause": {
    summary: "Dừng hoặc khôi phục robot trong một khu vực.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "mapCode", label: "Mã bản đồ" },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Dừng", value: "FREEZE" }, { label: "Chạy lại", value: "RUN" }] },
    ],
  },
  "zone-homing": {
    summary: "Đưa robot trong khu vực về bãi/khu vực cố định.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "autoShutdown", label: "Tắt nguồn sau khi về", type: "select", options: fieldOptions.yesNo },
      { name: "bootTime", label: "Thời gian bật lại", placeholder: "2030-01-01T08:00:00+07:00" },
      { name: "expireTime", label: "Thời gian timeout", placeholder: "2030-01-01T12:30:00Z" },
    ],
  },
  "zone-banish": {
    summary: "Clear area: đưa robot ra khỏi khu vực hoặc khôi phục khu vực.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Clear area", value: "BANISH" }, { label: "Khôi phục", value: "RUN" }] },
      { name: "pause", label: "Dừng robot sau khi clear", type: "select", options: [{ label: "Không", value: "0" }, { label: "Có", value: "1" }] },
      { name: "controlMode", label: "Cách clear", type: "select", options: [{ label: "Đi ra khỏi vùng", value: "0" }, { label: "Đi đến điểm đỗ tạm", value: "1" }, { label: "Đi đến vùng chỉ định", value: "2" }] },
      { name: "targetZoneCode", label: "Vùng đích", qr: true },
      { name: "expireTime", label: "Thời gian timeout", placeholder: "2030-01-01T12:30:00Z" },
    ],
  },
  "zone-blockade": {
    summary: "Chặn hoặc mở một khu vực để robot bên ngoài không đi vào.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "mapCode", label: "Mã bản đồ" },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Chặn khu vực", value: "BLOCKADE" }, { label: "Mở khu vực", value: "OPENUP" }] },
    ],
  },
  "task-query": {
    summary: "Tra cứu trạng thái task.",
    fields: [{ name: "robotTaskCode", label: "Mã task", qr: true }],
  },
  "robot-query": {
    summary: "Tra cứu trạng thái robot.",
    fields: [{ name: "singleRobotCode", label: "Mã robot", qr: true }],
  },
  "carrier-query": {
    summary: "Tra cứu trạng thái kệ/carrier.",
    fields: [{ name: "carrierCode", label: "Mã kệ", qr: true }],
  },
  "eqpt-notify": {
    summary: "Báo RCS rằng thiết bị bên thứ ba đã thực hiện xong một bước.",
    fields: [
      { name: "eqptCode", label: "Mã thiết bị", qr: true },
      { name: "taskCode", label: "Mã task", qr: true },
      { name: "actionStatus", label: "Trạng thái thực hiện", type: "select", options: [{ label: "Cửa mở đúng vị trí", value: "1" }, { label: "Cửa đóng đúng vị trí", value: "2" }, { label: "Thang máy mở cửa", value: "3" }, { label: "Hàng tới tầng đích", value: "4" }, { label: "Lấy hàng", value: "5" }, { label: "Đặt hàng", value: "6" }, { label: "Đã tới", value: "7" }] },
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "carrierType", label: "Loại kệ" },
    ],
  },
};
