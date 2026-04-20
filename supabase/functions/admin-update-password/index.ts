import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    // Admin client — service role key bypasses RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller's JWT using the admin client
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: callerErr } = await adminClient.auth.getUser(jwt);
    if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

    // Enforce admin-only access
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return json({ error: "Forbidden: admin access required" }, 403);
    }

    const { userId, password } = await req.json();
    if (!userId || !password) {
      return json({ error: "userId and password are required" }, 400);
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    );
    if (updateErr) throw updateErr;

    return json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin-update-password]", message);
    return json({ error: message }, 400);
  }
});
