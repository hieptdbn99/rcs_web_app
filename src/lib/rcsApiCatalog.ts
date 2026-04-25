export type RcsApiGroup = "task" | "asset" | "area" | "status" | "integration";
export type RcsApiDirection = "outbound" | "callback";
export type RcsRisk = "normal" | "careful" | "danger";

export type RcsApiDefinition = {
  id: string;
  title: string;
  group: RcsApiGroup;
  direction: RcsApiDirection;
  endpoint: string;
  description: string;
  workflow?: string;
  risk: RcsRisk;
  defaultPayload: Record<string, unknown>;
  localCallbackPath?: string;
  notes?: string[];
};

export const RCS_API_GROUPS: Array<{
  id: RcsApiGroup;
  title: string;
  description: string;
}> = [
  {
    id: "task",
    title: "Task workflow",
    description: "Tạo task, điều khiển vòng đời task, hủy và đổi ưu tiên.",
  },
  {
    id: "asset",
    title: "Kệ, carrier, point",
    description: "Gắn/bỏ gắn kệ, khóa/mở khóa carrier và point.",
  },
  {
    id: "area",
    title: "Khu vực",
    description: "Dừng/khôi phục robot trong vùng, clear, block, homing.",
  },
  {
    id: "status",
    title: "Trạng thái",
    description: "Tra cứu task, robot và carrier để theo dõi vận hành.",
  },
  {
    id: "integration",
    title: "Tích hợp và callback",
    description: "Thông báo thiết bị bên thứ ba và endpoint RCS gọi ngược.",
  },
];

export const RCS_API_CATALOG: RcsApiDefinition[] = [
  {
    id: "task-group",
    title: "Task Group",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/group",
    workflow: "1. Gom nhóm task",
    risk: "normal",
    description: "Tạo nhóm task khi các task có quan hệ thứ tự hoặc cần phân bổ theo group.",
    defaultPayload: {
      groupCode: "GROUP_001",
      strategy: "GROUP_SEQ",
      strategyValue: "1",
      groupSeq: 1,
      targetRoute: {
        type: "SITE",
        code: "STATION_A",
      },
      data: [
        {
          robotTaskCode: "TASK_001",
          sequence: 1,
        },
      ],
    },
  },
  {
    id: "task-submit",
    title: "Apply Task",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/submit",
    workflow: "2. Gửi task",
    risk: "normal",
    description: "Gửi yêu cầu tạo task để RCS sinh lệnh điều phối robot.",
    defaultPayload: {
      taskType: "PF-LMR-COMMON",
      targetRoute: [
        {
          seq: 0,
          type: "CARRIER",
          code: "RACK_01",
        },
        {
          seq: 1,
          type: "SITE",
          code: "STATION_A",
          operation: "DELIVERY",
        },
      ],
      initPriority: 10,
      interrupt: 0,
      extra: null,
    },
  },
  {
    id: "task-continue",
    title: "Continue Task",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/extend/continue",
    workflow: "3. Chạy bước tiếp theo",
    risk: "normal",
    description: "Dùng cho task nhiều bước, tiếp tục task theo trigger.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      triggerType: "TASK",
      triggerCode: "TASK_001",
      targetRoute: {
        seq: 1,
        type: "SITE",
        code: "STATION_B",
        autoStart: 1,
        operation: "DELIVERY",
      },
      extra: null,
    },
  },
  {
    id: "task-cancel",
    title: "Cancel Task",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/cancel",
    workflow: "4. Hủy task",
    risk: "danger",
    description: "Hủy task đang chờ hoặc đang thực thi. Cần xác nhận trước khi gọi.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      cancelType: "CANCEL",
      reason: "Manual cancel from Worker Panel",
      extra: null,
    },
  },
  {
    id: "task-priority",
    title: "Set Task Priority",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/priority",
    workflow: "5. Đổi ưu tiên",
    risk: "careful",
    description: "Đổi initPriority/deadline của task trước khi task kết thúc.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      initPriority: 20,
      deadline: "2026-04-25T12:30:00Z",
      extra: null,
    },
  },
  {
    id: "task-pretask",
    title: "Apply Pre-Scheduling Task",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/pretask",
    workflow: "6. Gọi robot đến trước",
    risk: "normal",
    description: "Gọi AMR đến điểm chỉ định trước khi task thật được tạo.",
    defaultPayload: {
      siteCode: "STATION_A",
      nextTaskTime: "60",
      priority: 10,
      taskCount: 1,
      amrDir: "999",
      extra: null,
    },
  },
  {
    id: "custom-normal",
    title: "General Custom API",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/custom/normal",
    workflow: "7. Custom notify/check",
    risk: "careful",
    description: "API tổng quát cho các scene tùy chỉnh như CHECK hoặc FULL_NOTIFY.",
    defaultPayload: {
      taskCode: "TASK_001",
      notifyType: "FULL_NOTIFY",
      extra: {
        siteInfo: ["STATION_A"],
      },
    },
  },
  {
    id: "carrier-bind",
    title: "Link Carrier to Point",
    group: "asset",
    direction: "outbound",
    endpoint: "/api/robot/controller/carrier/bind",
    workflow: "1. Gắn carrier vào point",
    risk: "careful",
    description: "Gắn carrier/kệ vào point khi cả hai không bị task chiếm dụng.",
    defaultPayload: {
      carrierCode: "RACK_01",
      siteCode: "SITE_A",
      carrierDir: 0,
      extra: null,
    },
  },
  {
    id: "carrier-unbind",
    title: "Unlink Carrier from Point",
    group: "asset",
    direction: "outbound",
    endpoint: "/api/robot/controller/carrier/unbind",
    workflow: "2. Bỏ gắn carrier",
    risk: "careful",
    description: "Bỏ liên kết carrier khỏi point.",
    defaultPayload: {
      carrierCode: "RACK_01",
      siteCode: "SITE_A",
      extra: null,
    },
  },
  {
    id: "site-bind",
    title: "Link/Unlink Storage Object to Carrier",
    group: "asset",
    direction: "outbound",
    endpoint: "/api/robot/controller/site/bind",
    workflow: "3. Gắn kệ vào vị trí",
    risk: "careful",
    description: "Gắn hoặc bỏ gắn storage object/point với carrier. Đây là luồng gắn kệ hiện tại của app.",
    defaultPayload: {
      slotCategory: "SITE",
      slotCode: "SITE_A",
      carrierCategory: "POD",
      carrierType: "66",
      carrierCode: "RACK_01",
      carrierDir: 0,
      invoke: "BIND",
      extra: null,
    },
  },
  {
    id: "carrier-lock",
    title: "Enable/Disable Carrier",
    group: "asset",
    direction: "outbound",
    endpoint: "/api/robot/controller/carrier/lock",
    workflow: "4. Khóa/mở khóa kệ",
    risk: "danger",
    description: "LOCK carrier để carrier và point liên kết không được giao task mới; UNLOCK để mở lại.",
    defaultPayload: {
      carrierCode: "RACK_01",
      invoke: "LOCK",
      extra: null,
    },
  },
  {
    id: "site-lock",
    title: "Enable/Disable Point",
    group: "asset",
    direction: "outbound",
    endpoint: "/api/robot/controller/site/lock",
    workflow: "5. Khóa/mở khóa point",
    risk: "danger",
    description: "LOCK point để point và carrier liên kết không được giao task mới; UNLOCK để mở lại.",
    defaultPayload: {
      siteCode: "SITE_A",
      invoke: "LOCK",
      extra: null,
    },
  },
  {
    id: "zone-pause",
    title: "Pause/Restore AMRs in Area",
    group: "area",
    direction: "outbound",
    endpoint: "/api/robot/controller/zone/pause",
    workflow: "1. Dừng/khôi phục vùng",
    risk: "danger",
    description: "FREEZE để dừng robot trong khu vực, RUN để khôi phục.",
    defaultPayload: {
      zoneCode: "ZONE_A",
      invoke: "FREEZE",
      extra: null,
    },
  },
  {
    id: "zone-homing",
    title: "Return AMR to Fixed Area",
    group: "area",
    direction: "outbound",
    endpoint: "/api/robot/controller/zone/homing",
    workflow: "2. Đưa robot về bãi",
    risk: "danger",
    description: "Yêu cầu robot trong vùng quay về khu vực cố định/parking.",
    defaultPayload: {
      zoneCode: "ZONE_A",
      autoShutdown: "NO",
      expireTime: "2026-04-25T12:30:00Z",
      extra: null,
    },
  },
  {
    id: "zone-banish",
    title: "Clear Area",
    group: "area",
    direction: "outbound",
    endpoint: "/api/robot/controller/zone/banish",
    workflow: "3. Clear area",
    risk: "danger",
    description: "Đưa AMR ra khỏi khu vực và cấm AMR khác đi vào, hoặc RUN để khôi phục.",
    defaultPayload: {
      zoneCode: "ZONE_A",
      invoke: "BANISH",
      pause: "0",
      controlMode: "0",
      expireTime: "2026-04-25T12:30:00Z",
      extra: null,
    },
  },
  {
    id: "zone-blockade",
    title: "Block/Release Area",
    group: "area",
    direction: "outbound",
    endpoint: "/api/robot/controller/zone/blockade",
    workflow: "4. Chặn/mở vùng",
    risk: "danger",
    description: "BLOCKADE để chặn AMR ngoài vùng đi vào, OPENUP để mở lại.",
    defaultPayload: {
      zoneCode: "ZONE_A",
      invoke: "BLOCKADE",
      extra: null,
    },
  },
  {
    id: "task-query",
    title: "Search Task Status",
    group: "status",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/query",
    workflow: "1. Theo dõi task",
    risk: "normal",
    description: "Tra cứu trạng thái task theo robotTaskCode.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
    },
  },
  {
    id: "robot-query",
    title: "Search AMR Status",
    group: "status",
    direction: "outbound",
    endpoint: "/api/robot/controller/robot/query",
    workflow: "2. Theo dõi robot",
    risk: "normal",
    description: "Tra cứu robot theo singleRobotCode: pin, online/offline, trạng thái, vị trí, alarm.",
    defaultPayload: {
      singleRobotCode: "AMR_001",
    },
  },
  {
    id: "carrier-query",
    title: "Search Carrier Status",
    group: "status",
    direction: "outbound",
    endpoint: "/api/robot/controller/carrier/query",
    workflow: "3. Theo dõi kệ",
    risk: "normal",
    description: "Tra cứu carrier theo carrierCode: task hiện tại, point liên kết, tọa độ, hướng và lock status.",
    defaultPayload: {
      carrierCode: "RACK_01",
    },
  },
  {
    id: "eqpt-notify",
    title: "Notify Third-Party Device Execution",
    group: "integration",
    direction: "outbound",
    endpoint: "/spi/wcs/robot/eqpt/notify",
    workflow: "1. Báo thiết bị đã xong",
    risk: "careful",
    description: "Báo RCS rằng thiết bị bên thứ ba như cửa, thang máy, conveyor đã thực hiện xong.",
    defaultPayload: {
      eqptCode: "EQPT_001",
      taskCode: "TASK_001",
      actionStatus: "1",
      siteCode: "SITE_A",
      extra: null,
    },
  },
  {
    id: "reporter-task",
    title: "Receive Task Performance Feedback",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/task",
    localCallbackPath: "/api/robot/reporter/task",
    workflow: "Callback 1",
    risk: "normal",
    description: "Endpoint để RCS gọi ngược khi task bắt đầu, lấy kệ, hoàn thành task.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      taskStatus: "start",
      carrierCode: "RACK_01",
      slotCode: "SITE_A",
    },
  },
  {
    id: "reporter-zone",
    title: "Receive Traffic Control Area Request",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/zone",
    localCallbackPath: "/api/robot/reporter/zone",
    workflow: "Callback 2",
    risk: "normal",
    description: "Endpoint để RCS gọi ngược khi xin/nhả traffic control area.",
    defaultPayload: {
      singleRobotCode: "AMR_001",
      zoneCode: "ZONE_A",
      invoke: "APPLY",
    },
  },
  {
    id: "reporter-resource",
    title: "Receive Resource Request from RCS",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/resource",
    localCallbackPath: "/api/robot/reporter/resource",
    workflow: "Callback 3",
    risk: "careful",
    description: "Endpoint để RCS xin tài nguyên từ WMS. Cần tùy biến logic trả về theo nghiệp vụ nhà máy.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      resourceType: "SITE",
    },
    notes: ["Bạn cần bổ sung rule WMS thật nếu RCS yêu cầu tài nguyên động."],
  },
  {
    id: "reporter-eqpt",
    title: "Receive Third-Party Device Request",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/eqpt",
    localCallbackPath: "/api/robot/reporter/eqpt",
    workflow: "Callback 4",
    risk: "careful",
    description: "Endpoint để RCS yêu cầu WCS điều khiển thiết bị bên thứ ba.",
    defaultPayload: {
      eqptCode: "EQPT_001",
      taskCode: "TASK_001",
      actionType: "OPEN",
    },
  },
  {
    id: "reporter-zone-homing",
    title: "Receive AMR Returning Feedback",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/zone/homing",
    localCallbackPath: "/api/robot/reporter/zone/homing",
    workflow: "Callback 5",
    risk: "normal",
    description: "Endpoint nhận feedback khi robot quay về fixed area xong.",
    defaultPayload: {
      homingCode: "HOMING_001",
      zoneCode: "ZONE_A",
      result: "SUCCESS",
    },
  },
  {
    id: "reporter-zone-banish",
    title: "Receive Area Clearing Feedback",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/zone/banish",
    localCallbackPath: "/api/robot/reporter/zone/banish",
    workflow: "Callback 6",
    risk: "normal",
    description: "Endpoint nhận feedback khi clear area hoàn tất hoặc timeout.",
    defaultPayload: {
      banishCode: "BANISH_001",
      zoneCode: "ZONE_A",
      result: "SUCCESS",
    },
  },
  {
    id: "reporter-robot-warning",
    title: "Receive AMR Exception Alarm",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/robot/warning",
    localCallbackPath: "/api/robot/reporter/robot/warning",
    workflow: "Callback 7",
    risk: "normal",
    description: "Endpoint nhận alarm nghiêm trọng của AMR.",
    defaultPayload: {
      singleRobotCode: "AMR_001",
      errorCode: "ALARM_001",
      errorMsg: "Obstacle ahead",
    },
  },
  {
    id: "reporter-task-warning",
    title: "Receive Task Exception Alarm",
    group: "integration",
    direction: "callback",
    endpoint: "/api/robot/reporter/task/warning",
    localCallbackPath: "/api/robot/reporter/task/warning",
    workflow: "Callback 8",
    risk: "normal",
    description: "Endpoint nhận alarm nghiêm trọng của task.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      errorCode: "TASK_ALARM_001",
      errorMsg: "Task exception",
    },
  },
];

export function getRcsApiById(id: string) {
  return RCS_API_CATALOG.find((api) => api.id === id);
}

export function getRcsCallbackByPath(path: string) {
  return RCS_API_CATALOG.find((api) => api.direction === "callback" && api.localCallbackPath === path);
}

export function getRcsApisByGroup(group: RcsApiGroup) {
  return RCS_API_CATALOG.filter((api) => api.group === group);
}
