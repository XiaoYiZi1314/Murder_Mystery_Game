import assert from "node:assert/strict";
import test from "node:test";

import {
  validateBookingRequest,
  validateJoinRequest,
} from "../../src/features/booking/validation";

test("自主预约拒绝缺少必填字段的申请", () => {
  const result = validateBookingRequest({
    script: "",
    players: "",
    time: "",
    name: "",
    contact: "",
  });

  assert.deepEqual(result, {
    script: "请选择剧本",
    players: "请输入预计人数",
    time: "请选择期望时间",
    name: "请输入联系人",
    contact: "请输入微信号或手机号",
  });
});

test("自主预约拒绝无效手机号", () => {
  const result = validateBookingRequest({
    script: "雾港来信",
    players: "4",
    time: "2026-09-12T19:00",
    name: "小雾",
    contact: "12345",
  });

  assert.equal(result.contact, "请输入有效的微信号或手机号");
});

test("场次报名人数不能超过剩余位置", () => {
  const result = validateJoinRequest(
    { players: "3", name: "小雾", contact: "13800138000" },
    2,
  );

  assert.equal(result.players, "本场最多还能报名 2 人");
});

test("有效预约和报名没有校验错误", () => {
  assert.deepEqual(
    validateBookingRequest({
      script: "长夜行",
      players: "6",
      time: "2026-09-12T19:00",
      name: "小雾",
      contact: "weixin_123",
    }),
    {},
  );
  assert.deepEqual(
    validateJoinRequest(
      { players: "2", name: "小雾", contact: "13800138000" },
      2,
    ),
    {},
  );
});
