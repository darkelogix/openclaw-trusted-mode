import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

describe('plugin schema contract', () => {
  it('passes schema/runtime drift check script', () => {
    const root = join(__dirname, '..');
    const out = execFileSync('node', ['scripts/verify_plugin_schema_contract.js'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(out).toMatch(/contract check passed/i);
  });
});
