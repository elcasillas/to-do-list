import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  console.error(
    "[Supabase] Missing env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. " +
    "Locally: add them to .env.local and restart the dev server. " +
    "Production: add them in Vercel → Settings → Environment Variables, then redeploy."
  );
}

export const supabase = createClient(url ?? "", key ?? "");
