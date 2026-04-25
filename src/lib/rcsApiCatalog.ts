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
    description: "Tao task, dieu khien vong doi task, huy va doi uu tien.",
  },
  {
    id: "asset",
    title: "Ke, carrier, point",
    description: "Gan/bo gan ke, khoa/mo khoa carrier va point.",
  },
  {
    id: "area",
    title: "Khu vuc",
    description: "Dung/khoi phuc robot trong vung, clear, block, homing.",
  },
  {
    id: "status",
    title: "Trang thai",
    description: "Tra cuu task, robot va carrier de theo doi van hanh.",
  },
  {
    id: "integration",
    title: "Tich hop va callback",
    description: "Thong bao thiet bi ben thu ba va endpoint RCS goi nguoc.",
  },
];

export const RCS_API_CATALOG: RcsApiDefinition[] = [
  {
    id: "task-group",
    title: "Task Group",
    group: "task",
    direction: "outbound",
    endpoint: "/api/robot/controller/task/group",
    workflow: "1. Gom nhom task",
    risk: "normal",
    description: "Tao nhom task khi cac task co quan he thu tu hoac can phan bo theo group.",
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
    workflow: "2. Gui task",
    risk: "normal",
    description: "Gui yeu cau tao task de RCS sinh lenh dieu phoi robot.",
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
    workflow: "3. Chay buoc tiep theo",
    risk: "normal",
    description: "Dung cho task nhieu buoc, tiep tuc task theo trigger.",
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
    workflow: "4. Huy task",
    risk: "danger",
    description: "Huy task dang cho hoac dang thuc thi. Can xac nhan truoc khi goi.",
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
    workflow: "5. Doi uu tien",
    risk: "careful",
    description: "Doi initPriority/deadline cua task truoc khi task ket thuc.",
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
    workflow: "6. Goi robot den truoc",
    risk: "normal",
    description: "Goi AMR den diem chi dinh truoc khi task that duoc tao.",
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
    description: "API tong quat cho cac scene tuy chinh nhu CHECK hoac FULL_NOTIFY.",
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
    workflow: "1. Gan carrier vao point",
    risk: "careful",
    description: "Gan carrier/ke vao point khi ca hai khong bi task chiem dung.",
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
    workflow: "2. Bo gan carrier",
    risk: "careful",
    description: "Bo lien ket carrier khoi point.",
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
    workflow: "3. Gan ke vao vi tri",
    risk: "careful",
    description: "Gan hoac bo gan storage object/point voi carrier. Day la luong gan ke hien tai cua app.",
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
    workflow: "4. Khoa/mo khoa ke",
    risk: "danger",
    description: "LOCK carrier de carrier va point lien ket khong duoc giao task moi; UNLOCK de mo lai.",
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
    workflow: "5. Khoa/mo khoa point",
    risk: "danger",
    description: "LOCK point de point va carrier lien ket khong duoc giao task moi; UNLOCK de mo lai.",
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
    workflow: "1. Dung/khoi phuc vung",
    risk: "danger",
    description: "FREEZE de dung robot trong khu vuc, RUN de khoi phuc.",
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
    workflow: "2. Dua robot ve bai",
    risk: "danger",
    description: "Yeu cau robot trong vung quay ve khu vuc co dinh/parking.",
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
    description: "Dua AMR ra khoi khu vuc va cam AMR khac di vao, hoac RUN de khoi phuc.",
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
    workflow: "4. Chan/mo vung",
    risk: "danger",
    description: "BLOCKADE de chan AMR ngoai vung di vao, OPENUP de mo lai.",
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
    workflow: "1. Theo doi task",
    risk: "normal",
    description: "Tra cuu trang thai task theo robotTaskCode.",
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
    workflow: "2. Theo doi robot",
    risk: "normal",
    description: "Tra cuu robot theo singleRobotCode: pin, online/offline, trang thai, vi tri, alarm.",
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
    workflow: "3. Theo doi ke",
    risk: "normal",
    description: "Tra cuu carrier theo carrierCode: task hien tai, point lien ket, toa do, huong va lock status.",
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
    workflow: "1. Bao thiet bi da xong",
    risk: "careful",
    description: "Bao RCS rang thiet bi ben thu ba nhu cua, thang may, conveyor da thuc hien xong.",
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
    description: "Endpoint de RCS goi nguoc khi task bat dau, lay ke, hoan thanh task.",
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
    description: "Endpoint de RCS goi nguoc khi xin/nhả traffic control area.",
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
    description: "Endpoint de RCS xin tai nguyen tu WMS. Can tuy bien logic tra ve theo nghiep vu nha may.",
    defaultPayload: {
      robotTaskCode: "TASK_001",
      resourceType: "SITE",
    },
    notes: ["Ban can bo sung rule WMS that neu RCS yeu cau tai nguyen dong."],
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
    description: "Endpoint de RCS yeu cau WCS dieu khien thiet bi ben thu ba.",
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
    description: "Endpoint nhan feedback khi robot quay ve fixed area xong.",
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
    description: "Endpoint nhan feedback khi clear area hoan tat hoac timeout.",
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
    description: "Endpoint nhan alarm nghiem trong cua AMR.",
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
    description: "Endpoint nhan alarm nghiem trong cua task.",
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
