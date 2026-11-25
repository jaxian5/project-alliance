import { createServerFn } from "@tanstack/react-start";

export type CloudStatus = { ready: boolean };

/** Server-only. The service role never reaches the browser. */
export const getCloudStatus = createServerFn({ method: "GET" }).handler(async (): Promise<CloudStatus> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { ready: Boolean(url && key) };
});
