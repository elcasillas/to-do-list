# CLAUDE.md — To Do List App

## Project Overview

A Monday.com-style task management app with collapsible groups, drag-and-drop reordering, a right-side task detail panel, and real-time Supabase persistence.

**Stack:** React 18 + TypeScript 5 (strict) · Vite 5 · Tailwind CSS 3 · Zustand · Supabase (PostgreSQL) · @dnd-kit · @floating-ui/react

**Live URL:** https://to-do-list-ved.vercel.app  
**GitHub:** https://github.com/elcasillas/to-do-list  
**Supabase project:** https://qnclwqjjurfpkwofqbhf.supabase.co

---

## Commands

```bash
npm run dev        # Start dev server at localhost:5173
npm run build      # tsc type check + Vite production build → dist/
npm run preview    # Preview dist/ locally
npx tsc --noEmit   # Type check only (run before every commit)
```

Always run `npx tsc --noEmit` before committing. The CI build runs `tsc` as the first build step.

---

## Environment Variables

Required in `.env.local` (local) and Vercel dashboard (production):

```
VITE_SUPABASE_URL=https://qnclwqjjurfpkwofqbhf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Vite bakes these into the bundle at build time — they must be set in the Vercel environment before deploying, not just locally.

---

## Architecture

### Data Flow

```
User action
  → Zustand store (optimistic, instant UI update)
    → Supabase (async write in background)
      → PostgreSQL (source of truth)
```

All mutations update local state immediately. Supabase writes fire in the background with `.catch(console.error)` — errors are logged but do not revert UI.

### File Structure

```
src/
├── App.tsx                    # Root layout: header + flex(main + side panel)
├── main.tsx                   # Entry point
├── vite-env.d.ts              # VITE_ env var types
├── types/index.ts             # All TypeScript interfaces (Task, Group, TaskUpdate, …)
├── store/
│   └── useTaskStore.ts        # Single Zustand store — all state and actions
├── lib/
│   ├── supabase.ts            # Supabase client singleton
│   ├── db.ts                  # All DB CRUD + snake_case ↔ camelCase mappers
│   └── utils.ts               # cn(), formatDate(), formatRelativeTime(), avatar helpers
├── hooks/
│   └── useClickOutside.ts     # Click-outside detection hook
└── components/
    ├── Toolbar.tsx             # Search, filter, sort, hide columns, show/hide done
    ├── TaskTable.tsx           # DnD context + renders GroupSection for each group
    ├── GroupSection.tsx        # Collapsible group with table-fixed table + TaskRow list
    ├── TaskRow.tsx             # Table row: inline editing, portal dropdowns, row click → panel
    ├── TaskCard.tsx            # Mobile card view
    ├── TaskModal.tsx           # Add / edit task modal
    ├── TaskSidePanel.tsx       # Right panel: header + tabs (Updates / Files / Activity)
    ├── TaskUpdatesTab.tsx      # Composer + update list
    ├── TaskUpdateComposer.tsx  # Textarea + Update button
    ├── TaskUpdateList.tsx      # Reverse-chrono list of TaskUpdate items
    ├── TaskFilesTab.tsx        # Empty state (file attachments — future)
    ├── TaskActivityLogTab.tsx  # Timeline derived from task + updates data
    └── ui/
        ├── Avatar.tsx          # Initials avatar (color from name hash)
        ├── StatusPill.tsx      # STATUS_CONFIG + pill component
        ├── PriorityPill.tsx    # PRIORITY_CONFIG + pill component
        └── ConfirmDialog.tsx   # Generic confirm modal
```

---

## State (Zustand Store)

`src/store/useTaskStore.ts` is the single source of truth.

### Key state slices

| Slice | Type | Purpose |
|---|---|---|
| `tasks` | `Task[]` | All tasks across all groups |
| `groups` | `Group[]` | All groups |
| `filter` | `FilterState` | Search, owner, status, priority filters |
| `sort` | `SortState` | Active sort field + direction |
| `hiddenColumns` | `HiddenColumns` | Per-column visibility |
| `showDoneTasks` | `boolean` | Toggle done task visibility (localStorage) |
| `selectedTaskId` | `string \| null` | Which task has the side panel open |
| `updates` | `Record<string, TaskUpdate[]>` | Updates per task, loaded on demand |
| `loading / error` | `boolean / string \| null` | Initial load state |

### Important actions

- `loadData()` — bootstraps app; seeds default data on first run
- `addTask / updateTask / deleteTask / duplicateTask` — optimistic CRUD
- `reorderTasks / moveBetweenGroups` — DnD handlers
- `selectTask(id)` — opens side panel; auto-loads updates if not cached
- `addTaskUpdate(taskId, content)` — optimistic update post; author from `localStorage.getItem("authorName")`
- `getFilteredGroupTasks(tasks, groupId, filter, sort, showDoneTasks)` — exported selector

---

## Database Schema

Three tables in Supabase. Run `schema.sql` in the Supabase SQL editor to create them.

```
groups        id, name, color, collapsed, sort_order, created_at
tasks         id, title, owner_*, status, priority, due_date, notes,
              completed, group_id, sort_order, created_at, updated_at
task_updates  id, task_id, author_name, author_initials, author_color,
              content, created_at, updated_at
```

**Column naming:** DB uses `snake_case`; app uses `camelCase`. All conversion happens in `src/lib/db.ts` mappers (`dbToTask`, `taskToDb`, etc.).

**`sort_order`** — used instead of `order` to avoid the SQL reserved word.  
**`due_date`** — stored as `TEXT` (ISO date string) to avoid timezone conversion issues.  
**RLS** — all tables have Row Level Security enabled with an `anon_all` policy allowing full anonymous access.

---

## Component Conventions

### Table layout
- `GroupSection` renders `<table className="w-full min-w-[640px] table-fixed">`.
- `table-fixed` is required — all groups share identical column widths determined by `<th>` declarations, not cell content.
- Column widths: Checkbox `w-10`, Task `w-56`, Updates `w-14`, Owner `w-14`, Status `w-[128px]`, Due date `w-24`, Priority `w-24`, Notes **flexible** (no width), Actions `w-9`.
- Notes column has no explicit width and grows to fill remaining space.

### Dropdowns (status, priority, actions menu)
- All use `@floating-ui/react` with `strategy: "fixed"` + `flip` / `shift` middleware.
- All render via `ReactDOM.createPortal` into `document.body` to escape `overflow: hidden` on the table.
- Pattern lives in `TaskRow.tsx` (`PortalMenu` component + `useFloating` hooks).

### Side panel
- Desktop: 460px wide, inline flex sibling to `<main>`.
- Mobile: `fixed inset-0 z-40` full-screen overlay.
- Opened by clicking a task row (blocked by `button` / `input` targets) or the `MessageCircle` icon in the Updates column.
- `selectedTaskId` in the store drives visibility; cleared automatically when a task is deleted.

### Styling
- All styles are Tailwind utility classes. No CSS modules.
- `cn(...classes)` = `clsx` + `tailwind-merge` — use for all conditional class composition.
- Color palette: `slate` (neutral), `blue` (primary/interactive), `emerald` (success/done), `red` (error/stuck), `amber` (working).
- Responsive breakpoint: `sm:` (640px) separates mobile card view from desktop table view.

---

## Key Patterns

### Adding a new column to the task table
1. Add field to `Task` in `src/types/index.ts`.
2. Add DB column to `schema.sql`; update `dbToTask` and `taskToDb` in `src/lib/db.ts`.
3. Add `<th>` with explicit width to `GroupSection.tsx` (update `visibleColCount` too).
4. Add matching `<td>` to `TaskRow.tsx`.
5. Add field to `TaskModal.tsx` form if it should be editable.
6. Add to `dbUpdateTask` patch logic in `db.ts`.

### Adding a new store action
1. Add to the `TaskStore` interface.
2. Implement in the store: optimistic local update first, then async DB call with `.catch(console.error)`.
3. Never `await` DB calls in the store — keep UI updates instant.

### Author for task updates
The update author is read from `localStorage.getItem("authorName")`, defaulting to `"Ed Casillas"`. Set it via `localStorage.setItem("authorName", "Your Name")` in the browser console to change the author.

---

## Deployment

Deployed on **Vercel** via GitHub integration (auto-deploys on push to `main`).

To deploy manually:
```bash
vercel --prod
```

Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set in **Vercel → Settings → Environment Variables** for **Production** and **Preview** environments. Adding vars does not trigger a redeploy — push a commit or manually redeploy after changing them.
