import { unprocessable } from "../http/errors";
export function invalid(field: string, message: string): never {
  throw unprocessable(message, { [field]: [message] });
}
export function id(value: unknown, field = "id"): bigint {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{0,18}$/.test(value) ||
    BigInt(value) > BigInt("9223372036854775807")
  )
    return invalid(field, "无效 ID");
  return BigInt(value);
}
export function integer(
  value: unknown,
  field: string,
  min = 1,
  max = 100,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    return invalid(field, `须为 ${min} 至 ${max} 的整数`);
  return value;
}
export function text(
  value: unknown,
  field: string,
  max = 500,
  required = false,
): string {
  if ((value === undefined || value === null) && !required) return "";
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    return invalid(field, "文本长度或格式不正确");
  return value.trim();
}
export function date(value: unknown, field: string, future = true): Date {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return invalid(field, "须为带时区的 ISO 时间");
  const [calendar, clock] = value.split("T"),
    [year, month, day] = calendar.split("-").map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    Number(clock.slice(0, 2)) > 23
  )
    return invalid(field, "日期不存在");
  const d = new Date(value);
  if (future && d.getTime() <= Date.now())
    return invalid(field, "时间必须在未来");
  return d;
}
export function money(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value)
  )
    return invalid("price", "价格须为非负两位小数金额字符串");
  return value;
}
export function whitelist(body: Record<string, unknown>, keys: string[]) {
  for (const key of Object.keys(body))
    if (!keys.includes(key)) invalid(key, "不允许修改此字段");
}
export function contact(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid("contact", "请填写联系人");
  const c = value as Record<string, unknown>;
  const name = text(c.name, "contact.name", 80, true),
    phone = text(c.phone, "contact.phone", 32, true);
  if (!/^1[3-9]\d{9}$/.test(phone))
    return invalid("contact.phone", "请填写有效手机号");
  return { contactName: name, contactPhone: phone };
}
export function ids(value: unknown, field: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30)
    return invalid(field, "最多选择 30 个");
  const result = value.map((v) => id(v, field));
  if (new Set(result).size !== result.length)
    return invalid(field, "不允许重复选择");
  return result;
}
