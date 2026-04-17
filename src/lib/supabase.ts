import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  console.error(
    "[Supabase] Missing env vars. Make sure VITE_SUPABASE_URL and " +
    "VITE_SUPABASE_ANON_KEY are set in .env.local and restart the dev server."
  );
}

export const supabase = createClient(url ?? "", key ?? "");
