import { moment } from "obsidian";

/**
 * Obsidian exports `moment` typed as `typeof import("moment")`. When the
 * code is compiled with `esModuleInterop` (as the plugin review tooling
 * does), that namespace type has no call signature, so a bare `moment()`
 * turns into an untyped call. Calling it through this explicitly typed
 * factory keeps the result a real `Moment` under either setting.
 */
const createMoment = moment as unknown as () => moment.Moment;

/** The current time as a Moment. */
export function now(): moment.Moment {
  return createMoment();
}
