/**
 * Hasil operasi yang kegagalannya diharapkan di modul murni (CODE_STYLE §7).
 * Kegagalan tak terduga tetap dilempar sebagai Error.
 */
export type Result<T, E extends string = string> =
  { ok: true; value: T } | { ok: false; error: E; details?: Record<string, unknown> };
