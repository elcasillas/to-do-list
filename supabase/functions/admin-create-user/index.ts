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

    const { email, password, fullName, role, status } = await req.json();
    if (!email || !password || !fullName) {
      return json({ error: "email, password, and fullName are required" }, 400);
    }

    // Create auth user — email_confirm: true skips confirmation email
    const { data: { user }, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });
    if (createErr) throw createErr;
    if (!user) throw new Error("User creation returned no user");

    // Upsert profile in case the DB trigger didn't fire
    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      role: role ?? "member",
      status: status ?? "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (profileErr) throw profileErr;

    return json({ id: user.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin-create-user]", message);
    return json({ error: message }, 400);
  }
});
