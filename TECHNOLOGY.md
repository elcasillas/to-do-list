# TECHNOLOGY.md — To Do List App

## Tech Stack Overview

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 18.2.0 |
| Language | TypeScript | 5.2.2 |
| Build Tool | Vite | 5.1.6 |
| Styling | Tailwind CSS | 3.4.1 |
| State Management | Zustand | 4.5.2 |
| Database / Backend | Supabase (PostgreSQL) | 2.103.3 |
| Drag and Drop | @dnd-kit | 6.x |
| Floating UI | @floating-ui/react | 0.27.19 |
| Icons | lucide-react | 0.363.0 |
| Date Utilities | date-fns | 3.6.0 |
| ID Generation | uuid | 9.0.0 |
| Class Utilities | clsx + tailwind-merge | 2.x |
| Deployment | Vercel | — |

---

## React 18

**What it does:** Core UI library. Renders components, manages the virtual DOM, and handles all user interactions.

**Why this project uses it:**
- Component model maps naturally to task rows, group sections, modals, and side panels
- Concurrent rendering ensures the UI stays responsive during heavy state updates (e.g., drag-and-drop reorders)
- `createPortal` is used to render dropdowns outside the table DOM, preventing overflow clipping

**Key usage in this project:**
- `useState` — local UI state (open/close menus, inline edit mode, draft values)
- `useRef` — DOM references for floating UI anchors and click-outside detection
- `useCallback` — stable references for floating UI merged refs and commit handlers
- `useEffect` — triggers `loadData()` on app mount
- `createPortal` — renders Status, Priority, and Actions dropdowns into `document.body`

---

## TypeScript 5 (Strict Mode)

**What it does:** Adds static types to JavaScript, catching errors at compile time instead of runtime.

**Configuration highlights (`tsconfig.json`):**
- `strict: true` — enables all strict checks (no implicit `any`, strict null checks, etc.)
- `noEmit: true` — TypeScript only type-checks; Vite handles the actual transpilation
- `isolatedModules: true` — each file is compiled independently, compatible with Vite/esbuild
- `moduleResolution: bundler` — uses Vite's module resolution rules

**Key types (`src/types/index.ts`):**
```typescript
TaskStatus  = "not_started" | "working" | "done" | "stuck"
TaskPriority = "low" | "medium" | "high" | "urgent"
Task         // id, title, owner, status, dueDate, priority, notes, completed, groupId, order, timestamps
Group        // id, name, color, collapsed, order
TaskUpdate   // id, taskId, authorName, authorInitials, authorColor, content, timestamps
FilterState  // search, owner, status, priority
SortState    // field, direction
HiddenColumns // per-column boolean flags
```

**Type check command:**
```bash
npx tsc --noEmit
```

---

## Vite 5

**What it does:** Build tool and development server. Replaces Create React App / Webpack.

**Why Vite:**
- Near-instant dev server startup (serves source files directly via native ES modules)
- Hot Module Replacement (HMR) — React components update in the browser without full reload
- Fast production builds via Rollup bundling
- Native TypeScript support (transpiles via esbuild, type-checks via `tsc`)

**Environment variables:**
- Must be prefixed with `VITE_` to be exposed to the browser bundle
- Accessed via `import.meta.env.VITE_*` (not `process.env`)
- Injected at build time — changing them requires a rebuild

**Build output:**
```
dist/
├── index.html
└── assets/
    ├── index-[hash].js    # Bundled + minified JS
    └── index-[hash].css   # Extracted + minified CSS
```

---

## Tailwind CSS 3

**What it does:** Utility-first CSS framework. All styles are applied via class names directly in JSX.

**Why Tailwind:**
- No separate stylesheet to maintain — styles live with components
- Consistent design tokens (spacing, colors, typography) across the entire UI
- PurgeCSS built in — only classes actually used are included in the production build
- Responsive prefixes (`sm:`, `lg:`) and state variants (`hover:`, `group-hover:`, `focus:`) handle all interactive states inline

**Key conventions in this project:**
- `cn(...classes)` utility (`clsx` + `tailwind-merge`) used for all conditional class logic — prevents class conflicts
- Color palette: `slate` (neutral UI), `blue` (primary/selected), `emerald` (done/success), `amber` (working), `red` (stuck/error), `violet` (priority pills)
- `group/row` and `group-hover/row:` — scoped group hover for table row interactions
- `table-fixed` — applied to all group tables to enforce consistent column widths across groups

**PostCSS pipeline:** Tailwind → Autoprefixer → browser-ready CSS

---

## Zustand 4

**What it does:** Lightweight global state management. Replaces Redux or React Context for shared state.

**Why Zustand:**
- No boilerplate (no reducers, no action creators, no providers)
- Direct store access from any component via `useTaskStore()`
- Works outside React components (store actions can call each other)
- Minimal re-renders — components only re-render when their selected slice changes

**Store structure (`src/store/useTaskStore.ts`):**
```
State
  tasks[]          All tasks (all groups)
  groups[]         All groups
  filter           Search + owner + status + priority
  sort             Active field + direction
  hiddenColumns    Per-column show/hide flags
  showDoneTasks    Visibility toggle (persisted to localStorage)
  selectedTaskId   Which task's side panel is open
  updates{}        TaskUpdate[] per task_id (loaded on demand)
  updatesLoading   Loading state for update fetches
  loading / error  Initial data load state

Actions
  loadData()             Bootstrap: fetch from Supabase, seed on first run
  addTask / updateTask / deleteTask / duplicateTask
  reorderTasks           DnD reorder within a group
  moveBetweenGroups      DnD move across groups
  addGroup / updateGroup / deleteGroup / toggleGroup
  selectTask(id)         Open side panel + lazy-load updates
  addTaskUpdate(taskId, content)
  setFilter / clearFilters / setSort / toggleColumn / toggleShowDoneTasks
```

**Optimistic update pattern (used everywhere):**
```typescript
// 1. Update local state immediately (instant UI)
set({ tasks: updatedTasks });
// 2. Sync to database in background (fire and forget)
dbUpdateTask(id, patch).catch(console.error);
```

**localStorage persistence:** Only `showDoneTasks` is persisted (`localStorage.getItem/setItem("showDoneTasks")`). All other state resets on page reload and is re-fetched from Supabase.

---

## Supabase

**What it does:** Provides a hosted PostgreSQL database with a REST API (PostgREST), authentication, and storage — all accessible from the browser via the JS SDK.

**Why Supabase:**
- Instant REST API auto-generated from the PostgreSQL schema (no backend code needed)
- Row Level Security (RLS) handles access control at the DB level
- Anonymous access — no user login required (anon role with open RLS policies)
- SDK mirrors SQL operations in a fluent TypeScript API

**Client setup (`src/lib/supabase.ts`):**
```typescript
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
```

**Database operations (`src/lib/db.ts`):**

All DB interaction goes through this single file. Pattern for every entity:
1. **Mapper functions** — convert between Supabase `snake_case` rows and app `camelCase` types
2. **CRUD functions** — thin wrappers around `supabase.from(...).select/insert/update/delete`

```typescript
// Example pattern
function dbToTask(row): Task { /* snake_case → camelCase */ }
function taskToDb(t: Task)   { /* camelCase → snake_case */ }

export async function dbUpdateTask(id, updates) {
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}
```

**Tables:**

| Table | Key columns |
|---|---|
| `groups` | id, name, color, collapsed, sort_order |
| `tasks` | id, title, owner_*, status, priority, due_date, notes, completed, group_id, sort_order |
| `task_updates` | id, task_id, author_name, author_initials, author_color, content |

**Design decisions:**
- `sort_order` instead of `order` — `order` is a reserved SQL keyword
- `due_date TEXT` instead of `DATE` — avoids timezone conversion issues in PostgREST
- `id TEXT` instead of `UUID` — supports both UUIDs and fixed string IDs (e.g., "group-todo")
- `created_at / updated_at TEXT` on tasks/updates — stored as ISO strings, consistent with JS `new Date().toISOString()`

**RLS policy (all tables):**
```sql
create policy "anon_all" on public.<table>
  for all to anon using (true) with check (true);
```

---

## @dnd-kit

**What it does:** Drag-and-drop library for reordering tasks within groups and moving them between groups.

**Why @dnd-kit:**
- Headless (no imposed UI) — fully compatible with the existing table/card layout
- Accessible by default (keyboard support, ARIA attributes)
- Modular — only the pieces needed are imported

**Components used:**
- `DndContext` — wraps `TaskTable`, provides drag events
- `SortableContext` + `useSortable` — makes each `TaskRow` a sortable item
- `useDroppable` — makes each `GroupSection` a drop target
- `DragOverlay` — renders a floating preview of the dragged task
- `PointerSensor` with `activationConstraint: { distance: 8 }` — prevents accidental drags on clicks

**Drag events:**
- `onDragStart` — captures the active task for the overlay
- `onDragEnd` — determines if the drop was within the same group (`reorderTasks`) or across groups (`moveBetweenGroups`)

**Conflict with row click:** The 8px activation distance means a simple click never triggers a drag, so the row click → open side panel behavior coexists cleanly.

---

## @floating-ui/react

**What it does:** Positions floating elements (dropdowns, tooltips, popovers) intelligently — avoiding viewport overflow, flipping when there's no space, and staying anchored to their trigger.

**Why @floating-ui:**
- The task table uses `overflow: hidden` on its container, which clips `position: absolute` dropdowns
- `strategy: "fixed"` + `createPortal` escapes the overflow constraint entirely
- `flip()` and `shift()` middleware ensure dropdowns never go off-screen (critical for the last row)

**Usage in `TaskRow.tsx`:**
```typescript
const FLOATING_MIDDLEWARE = [offset(4), flip({ padding: 8 }), shift({ padding: 8 })];

// One useFloating per dropdown (Status, Priority, Actions menu)
const { refs, floatingStyles } = useFloating({
  strategy: "fixed",
  placement: "bottom-start",
  middleware: FLOATING_MIDDLEWARE,
  whileElementsMounted: autoUpdate, // repositions on scroll/resize
});
```

The `PortalMenu` component wraps `createPortal` + `useClickOutside` for clean open/close behavior.

---

## lucide-react

**What it does:** Icon library. Provides SVG icons as React components.

**Usage:** Import individual icons by name — tree-shaken automatically by Vite so unused icons don't bloat the bundle.

```typescript
import { CheckSquare, Trash2, MessageCircle } from "lucide-react";
<MessageCircle className="w-4 h-4" />
```

---

## uuid

**What it does:** Generates RFC 4122 v4 UUIDs for new tasks, groups, and updates.

```typescript
import { v4 as uuidv4 } from "uuid";
const id = uuidv4(); // "110e8400-e29b-41d4-a716-446655440000"
```

Used in every `add*` and `duplicate*` store action to generate IDs client-side before the record is inserted into Supabase.

---

## clsx + tailwind-merge

**What they do:**
- `clsx` — conditionally joins class strings (`clsx("a", condition && "b")`)
- `tailwind-merge` — deduplicates conflicting Tailwind classes (e.g., `"px-2 px-4"` → `"px-4"`)

Combined into the `cn()` utility in `src/lib/utils.ts`:
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Used everywhere conditional classes are needed:
```typescript
className={cn(
  "base-classes",
  isSelected && "selected-classes",
  isDragging && "dragging-classes"
)}
```

---

## Vercel

**What it does:** Hosts and deploys the app. Connects to the GitHub repo and auto-deploys on every push to `main`.

**Build settings (auto-detected):**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 24.x

**Environment variables required in Vercel dashboard:**
- `VITE_SUPABASE_URL` — must be set for Production and Preview
- `VITE_SUPABASE_ANON_KEY` — must be set for Production and Preview

**Important:** Adding environment variables does not automatically trigger a redeploy. A new commit or manual redeploy is required for the new vars to be baked into the bundle.

**CLI deployment:**
```bash
vercel --prod   # Deploy to production
vercel env ls   # List configured environment variables
vercel env add VITE_SUPABASE_URL production   # Add a variable
```
