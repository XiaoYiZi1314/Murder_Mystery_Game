import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePreviewEmail } from '../../src/features/dev/design-system/validation';

test('design preview email validation exposes empty, invalid, and valid states', () => {
  assert.equal(validatePreviewEmail(''), '请输入邮箱地址');
  assert.equal(validatePreviewEmail('fog@'), '请输入有效的邮箱地址');
  assert.equal(validatePreviewEmail(' hello@shisanwu.cn '), undefined);
});
