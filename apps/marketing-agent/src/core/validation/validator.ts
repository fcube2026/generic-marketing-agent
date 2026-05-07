/**
 * Tiny structural validator used in place of a runtime-schema dep (zod/yup).
 *
 * We use it to validate domain packs and the agent config at load time so
 * misconfigured deployments fail loudly with a useful message, instead of
 * silently producing wrong UI state at runtime.
 *
 * Intentionally minimal: just enough to validate the shapes we own. If we
 * ever need parsing, refinements, or transforms we should pull in `zod`
 * proper as a real dependency rather than expanding this file.
 */

export type Validator<T> = (value: unknown, path?: string) => T;

export class ValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(`${path || '<root>'}: ${message}`);
    this.name = 'ValidationError';
  }
}

const fail = (path: string | undefined, msg: string): never => {
  throw new ValidationError(msg, path ?? '');
};

export const v = {
  string: (): Validator<string> => (val, path) =>
    typeof val === 'string' ? val : fail(path, `expected string, got ${typeofOf(val)}`),

  number: (): Validator<number> => (val, path) =>
    typeof val === 'number' && Number.isFinite(val)
      ? val
      : fail(path, `expected number, got ${typeofOf(val)}`),

  boolean: (): Validator<boolean> => (val, path) =>
    typeof val === 'boolean' ? val : fail(path, `expected boolean, got ${typeofOf(val)}`),

  literal: <T extends string | number | boolean>(value: T): Validator<T> => (val, path) =>
    val === value ? (val as T) : fail(path, `expected ${JSON.stringify(value)}`),

  oneOf: <T extends string>(values: readonly T[]): Validator<T> => (val, path) =>
    typeof val === 'string' && (values as readonly string[]).includes(val)
      ? (val as T)
      : fail(path, `expected one of ${values.join(', ')}`),

  array: <T>(item: Validator<T>): Validator<T[]> => (val, path) => {
    if (!Array.isArray(val)) return fail(path, `expected array, got ${typeofOf(val)}`);
    return val.map((entry, i) => item(entry, `${path ?? ''}[${i}]`));
  },

  object: <S extends Record<string, Validator<unknown>>>(
    shape: S,
  ): Validator<{ [K in keyof S]: ReturnType<S[K]> }> => (val, path) => {
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      return fail(path, `expected object, got ${typeofOf(val)}`);
    }
    const out: Record<string, unknown> = {};
    const obj = val as Record<string, unknown>;
    for (const key of Object.keys(shape)) {
      out[key] = shape[key](obj[key], `${path ? path + '.' : ''}${key}`);
    }
    return out as { [K in keyof S]: ReturnType<S[K]> };
  },

  optional: <T>(inner: Validator<T>): Validator<T | undefined> => (val, path) =>
    val === undefined || val === null ? undefined : inner(val, path),

  record: <T>(value: Validator<T>): Validator<Record<string, T>> => (val, path) => {
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      return fail(path, `expected record, got ${typeofOf(val)}`);
    }
    const out: Record<string, T> = {};
    for (const [k, v2] of Object.entries(val as Record<string, unknown>)) {
      out[k] = value(v2, `${path ? path + '.' : ''}${k}`);
    }
    return out;
  },

  /**
   * Pass-through for free-form data we don't want to constrain (e.g. seed
   * resource bodies that vary per domain pack).
   */
  any: (): Validator<unknown> => (val) => val,
};

function typeofOf(val: unknown): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}
