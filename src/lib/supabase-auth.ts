import { supabase } from "./supabase";

export async function ensureAnonymousUser(displayName?: string) {
  // Check whether this browser already has an authenticated session.
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  // Reuse the existing identity.
  if (session?.user) {
    return session.user;
  }

  // Otherwise, create a new anonymous identity.
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: displayName ? { display_name: displayName } : {}
    }
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Anonymous authentication failed.");
  }

  return data.user;
}
