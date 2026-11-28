import { createServerFn } from "@tanstack/react-start";

export type CloudStatus = { ready: boolean };

/**
 * Server-only cloud readiness probe.
 * Today: env presence only.
 * Next (Supabase): verify service role can reach `rooms` / `games` tables and
 * return { ready, projectRef }. Schedule ticks can move to an Edge Function that
 * imports the pure `tickSchedule` helper from `./schedule.ts`.
 */
export const getCloudStatus = createServerFn({ method: "GET" }).handler(async (): Promise<CloudStatus> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { ready: Boolean(url && key) };
});
