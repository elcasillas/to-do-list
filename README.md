# To Do List App

A modern, full-featured task management app built with React, TypeScript, Tailwind CSS, and Supabase.

## Tech stack

- **Frontend** — React 18 + TypeScript + Vite
- **Styling** — Tailwind CSS
- **State** — Zustand (optimistic local state)
- **Backend** — Supabase (Postgres + PostgREST + RLS)
- **Drag & drop** — @dnd-kit

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/elcasillas/to-do-list.git
cd to-do-list
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Find these values in your Supabase project at:  
**Settings → API → Project URL & Project API keys (anon/public)**

### 3. Run the database schema

Open the Supabase SQL editor for your project and paste + run the contents of [`schema.sql`](./schema.sql):

**https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql**

This creates:
- `groups` table — collapsible task groups with color labels
- `tasks` table — full task records with status, priority, owner, due date, notes
- Row Level Security policies allowing anonymous access
- Indexes for fast ordering queries

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
On first load the app auto-seeds default groups and sample tasks into Supabase.

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon/public API key (safe to expose in browser) |

> **Note:** Vite apps use the `VITE_` prefix (not `NEXT_PUBLIC_`). Variables are injected at build time via `import.meta.env`.

---

## Project structure

```
src/
├── lib/
│   ├── supabase.ts      # Supabase client (singleton)
│   ├── db.ts            # All database CRUD helpers
│   └── utils.ts         # Date formatting, className helpers
├── store/
│   └── useTaskStore.ts  # Zustand store — optimistic UI + Supabase sync
├── components/
│   ├── ui/              # StatusPill, PriorityPill, Avatar, ConfirmDialog
│   ├── Toolbar.tsx      # Search, filter, sort, column toggle
│   ├── TaskRow.tsx      # Desktop table row (inline editing, dropdowns)
│   ├── TaskCard.tsx     # Mobile card view
│   ├── GroupSection.tsx # Collapsible group with table
│   ├── TaskTable.tsx    # DnD context + all groups
│   └── TaskModal.tsx    # Add / edit task modal
├── types/index.ts       # TypeScript interfaces
├── App.tsx              # Root layout, loading/error states
└── main.tsx
```

---

## Data flow

```
User action
  → Zustand store (optimistic, instant UI update)
    → Supabase (async write in background)
      → Postgres (source of truth)
```

All mutations update the UI immediately. Supabase writes happen in the background and errors are logged to the console without reverting the UI (optimistic strategy).

---

## Database schema

| Table | Key columns |
|---|---|
| `groups` | `id`, `name`, `color`, `collapsed`, `sort_order` |
| `tasks` | `id`, `title`, `status`, `priority`, `due_date`, `completed`, `group_id`, `sort_order`, `owner_*`, `notes` |

Task `status` values: `not_started` · `working` · `done` · `stuck`  
Task `priority` values: `low` · `medium` · `high` · `urgent`

---

## Build for production

```bash
npm run build
npm run preview
```
