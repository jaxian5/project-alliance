import { supabase } from "./supabase";

export async function ensureAnonymousUser() {
  // Check whether the player already has a session.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  // Reuse the existing identity if one exists.
  if (session?.user) {
    return session.user;
  }

  // Otherwise, create a new anonymous identity.
  const {
    data,
    error,
  } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Anonymous authentication failed.");
  }

  return data.user;
}
