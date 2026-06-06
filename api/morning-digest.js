const SUPABASE_URL = "https://qnclwqjjurfpkwofqbhf.supabase.co/rest/v1";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} — ${path}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const [tasks, updates, groups] = await Promise.all([
      supabaseFetch("/tasks?select=id,title,status,priority,due_date,notes,completed,owner_name,group_id&completed=eq.false&order=due_date"),
      supabaseFetch("/task_updates?select=task_id,content,author_name,created_at&order=created_at.desc&limit=200"),
      supabaseFetch("/groups?select=id,name&order=sort_order"),
    ]);
    const payload = JSON.stringify({ tasks, task_updates: updates, groups });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html><body><pre id="data">${payload}</pre></body></html>`);
  } catch (err) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(500).send(`<!DOCTYPE html><html><body><pre id="data">${JSON.stringify({ error: err.message })}</pre></body></html>`);
  }
}
