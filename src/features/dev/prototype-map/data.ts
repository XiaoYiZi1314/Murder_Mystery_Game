export const groups = [
  {
    "id": "module-map",
    "eyebrow": "C 端 · 顾客",
    "title": "把“想玩”变成“已锁车”。",
    "count": "04 个关键屏幕",
    "cards": [
      {
        "href": "scripts.html",
        "id": "launcher-scripts",
        "badge": "C-01",
        "title": "剧本浏览",
        "description": "搜索、标签筛选、排序，直接进入剧本详情。",
        "route": "/scripts"
      },
      {
        "href": "script-detail.html",
        "id": "launcher-script-detail",
        "badge": "C-02",
        "title": "剧本详情",
        "description": "非剧透角色介绍、关联 DM / 妆造、评价与预约入口。",
        "route": "/scripts/[id]"
      },
      {
        "href": "sessions.html",
        "id": "launcher-sessions",
        "badge": "C-03",
        "title": "拼车大厅",
        "description": "看还差几人，替全队报名，避免错过开放场次。",
        "route": "/sessions"
      },
      {
        "href": "me.html",
        "id": "launcher-me",
        "badge": "C-04",
        "title": "个人中心",
        "description": "会员、余额、积分、预约与完整流水集中查看。",
        "route": "/me"
      }
    ]
  },
  {
    "id": "supporting-map",
    "eyebrow": "补齐的业务入口",
    "title": "从选择、信任到反馈，都有下一步。",
    "count": "04 个扩展模块",
    "cards": [
      {
        "href": "dms.html",
        "id": "launcher-dms",
        "badge": "C-05",
        "title": "DM 浏览",
        "description": "按带本风格筛选，进入 DM 主页并查看评价。",
        "route": "/dms"
      },
      {
        "href": "costumes.html",
        "id": "launcher-costumes",
        "badge": "C-06",
        "title": "妆造浏览",
        "description": "浏览妆造档案、关联剧本与现场预约入口。",
        "route": "/costumes"
      },
      {
        "href": "gifts.html",
        "id": "launcher-gifts",
        "badge": "C-07",
        "title": "积分礼品",
        "description": "查看积分余额、礼品橱窗与线下兑换流程。",
        "route": "/gifts"
      },
      {
        "href": "login.html",
        "id": "launcher-login",
        "badge": "C-08",
        "title": "登录注册",
        "description": "手机号 + 密码入口，连接完整顾客流程。",
        "route": "/login"
      }
    ]
  },
  {
    "id": "admin-map",
    "eyebrow": "B 端 · 商家",
    "title": "把每一笔店内动作留在台账里。",
    "count": "05 个关键屏幕",
    "cards": [
      {
        "href": "admin.html",
        "id": "launcher-admin",
        "badge": "B-01",
        "title": "运营工作台",
        "description": "今日场次、待办提醒、待审核预约一屏处理。",
        "route": "/admin"
      },
      {
        "href": "admin-sessions.html",
        "id": "launcher-admin-sessions",
        "badge": "B-02",
        "title": "场次管理",
        "description": "创建、锁车、登记押金、推进状态机。",
        "route": "/admin/sessions"
      },
      {
        "href": "admin-finance.html",
        "id": "launcher-admin-finance",
        "badge": "B-03",
        "title": "财务与结算",
        "description": "待结算、充值、消费、押金与积分流水。",
        "route": "/admin/finance"
      },
      {
        "href": "admin-ops.html",
        "id": "launcher-admin-ops",
        "badge": "B-05",
        "title": "运营处理",
        "description": "审核、报名、押金退款、评价举报与资产状态。",
        "route": "/admin/ops"
      }
    ]
  }
];
