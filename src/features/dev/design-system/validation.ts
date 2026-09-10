export function validatePreviewEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return '请输入邮箱地址';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '请输入有效的邮箱地址';
  return undefined;
}
