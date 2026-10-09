import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

const supabaseProjectUrl = configuredSupabaseUrl
  ? new URL(configuredSupabaseUrl.trim())
  : null;

if (supabaseProjectUrl && supabaseProjectUrl.protocol !== "https:") {
  throw new Error("VITE_SUPABASE_URL must use HTTPS.");
}

if (
  supabaseProjectUrl &&
  (supabaseProjectUrl.pathname !== "/" || supabaseProjectUrl.search || supabaseProjectUrl.hash)
) {
  console.warn(
    "VITE_SUPABASE_URL should be the project base URL. Ignoring its path, query, and fragment.",
  );
}

export const supabase =
  supabaseProjectUrl && supabaseAnonKey
    ? createClient(supabaseProjectUrl.origin, supabaseAnonKey)
    : null;
