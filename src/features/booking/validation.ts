export interface BookingRequestValues {
  script: string;
  players: string;
  time: string;
  name: string;
  contact: string;
}

export interface JoinRequestValues {
  players: string;
  name: string;
  contact: string;
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

const mobilePattern = /^1[3-9]\d{9}$/;
const wechatPattern = /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/;

function validateContact(contact: string): string | undefined {
  const value = contact.trim();
  if (!value) return "请输入微信号或手机号";
  if (!mobilePattern.test(value) && !wechatPattern.test(value)) {
    return "请输入有效的微信号或手机号";
  }
  return undefined;
}

export function validateBookingRequest(
  values: BookingRequestValues,
): ValidationErrors<BookingRequestValues> {
  const errors: ValidationErrors<BookingRequestValues> = {};
  if (!values.script) errors.script = "请选择剧本";
  if (!values.players) errors.players = "请输入预计人数";
  else {
    const players = Number(values.players);
    if (!Number.isInteger(players) || players < 1 || players > 12) {
      errors.players = "预计人数应为 1–12 人";
    }
  }
  if (!values.time) errors.time = "请选择期望时间";
  if (!values.name.trim()) errors.name = "请输入联系人";
  const contactError = validateContact(values.contact);
  if (contactError) errors.contact = contactError;
  return errors;
}

export function validateJoinRequest(
  values: JoinRequestValues,
  remaining: number,
): ValidationErrors<JoinRequestValues> {
  const errors: ValidationErrors<JoinRequestValues> = {};
  if (!values.players) errors.players = "请输入预计人数";
  else {
    const players = Number(values.players);
    if (!Number.isInteger(players) || players < 1) {
      errors.players = "预计人数至少为 1 人";
    } else if (players > remaining) {
      errors.players = `本场最多还能报名 ${remaining} 人`;
    }
  }
  if (!values.name.trim()) errors.name = "请输入联系人";
  const contactError = validateContact(values.contact);
  if (contactError) errors.contact = contactError;
  return errors;
}
