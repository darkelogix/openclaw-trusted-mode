import { describe, expect, it } from 'vitest';
import { enforceConstraints } from '../src/constraints';
import { curateContext } from '../src/contextCurator';

describe('enforceConstraints', () => {
  it('allows when value matches an allowed prefix', () => {
    const params = { path: '/tmp/file.txt' };
    const constraints = [{ key: 'path', allowed_prefixes: ['/tmp', '/safe'] }];

    expect(() => enforceConstraints(params, constraints)).not.toThrow();
  });

  it('blocks when value does not match any allowed prefix', () => {
    const params = { path: '/etc/passwd' };
    const constraints = [{ key: 'path', allowed_prefixes: ['/tmp', '/safe'] }];

    expect(() => enforceConstraints(params, constraints)).toThrow(/Constraint violation/);
  });

  it('blocks prefix-collision paths that only share a string prefix', () => {
    const params = { path: '/tmp-evil/file.txt' };
    const constraints = [{ key: 'path', allowed_prefixes: ['/tmp'] }];

    expect(() => enforceConstraints(params, constraints)).toThrow(/Constraint violation/);
  });

  it('blocks path traversal outside the allowed prefix', () => {
    const params = { path: '/safe/../etc/passwd' };
    const constraints = [{ key: 'path', allowed_prefixes: ['/safe'] }];

    expect(() => enforceConstraints(params, constraints)).toThrow(/Constraint violation/);
  });

  it('blocks windows paths that only share a string prefix', () => {
    const params = { path: 'C:\\safe-old\\file.txt' };
    const constraints = [{ key: 'path', allowed_prefixes: ['C:\\safe'] }];

    expect(() => enforceConstraints(params, constraints)).toThrow(/Constraint violation/);
  });

  it('allows normalized descendant windows paths inside the allowed prefix', () => {
    const params = { path: 'C:/safe/subdir/file.txt' };
    const constraints = [{ key: 'path', allowed_prefixes: ['C:\\safe'] }];

    expect(() => enforceConstraints(params, constraints)).not.toThrow();
  });

  it('ignores malformed constraint objects', () => {
    const params = { path: '/etc/passwd' };
    const constraints = [{ key: 123 }, null, { allowed_prefixes: ['/tmp'] }];

    expect(() => enforceConstraints(params, constraints)).not.toThrow();
  });

  it('ignores non-string values for constrained keys', () => {
    const params = { path: 42 };
    const constraints = [{ key: 'path', allowed_prefixes: ['/tmp'] }];

    expect(() => enforceConstraints(params, constraints)).not.toThrow();
  });

  it('throws when constraints are not an array', () => {
    const params = { path: '/tmp/file.txt' };
    const constraints = { key: 'path', allowed_prefixes: ['/tmp'] };

    expect(() => enforceConstraints(params, constraints)).toThrow(/Invalid constraints format/);
  });
});

describe('contextCurator', () => {
  it('is deterministic and redacts matching keys', () => {
    const payload = { user: { api_key: 'secret' }, msg: 'hello' };
    const config = { enabled: true, redactKeys: ['api_key'] };

    const a = curateContext(payload, config).summary;
    const b = curateContext(payload, config).summary;

    expect(a).toEqual(b);
    expect(a).toContain('[REDACTED]');
  });
});
