import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  Search,
  Plus,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  Users,
  X,
  Check,
  Trash2,
  UserX,
  UserCheck,
  Mail,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  useFloating,
  autoUpdate,
  flip,
  shift,
  offset,
} from "@floating-ui/react";
import { Avatar } from "../components/ui/Avatar";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useAuthStore, isAdmin } from "../store/useAuthStore";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  loadProfiles,
  loadPendingInvites,
  dbUpdateProfile,
  dbDeleteProfile,
  dbCreateInvite,
  dbDeleteInvite,
  dbAdminCount,
} from "../lib/db";
import { cn, formatRelativeTime, generateInitials, getAvatarColor } from "../lib/utils";
import type { UserProfile, UserRole, PendingInvite } from "../types";

// ── Role / status config ──────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  admin:   { label: "Admin",   className: "bg-blue-100 text-blue-700" },
  manager: { label: "Manager", className: "bg-violet-100 text-violet-700" },
  member:  { label: "Member",  className: "bg-slate-100 text-slate-600" },
};

const STATUS_CONFIG = {
  active:   { label: "Active",   className: "bg-emerald-100 text-emerald-700" },
  invited:  { label: "Invited",  className: "bg-amber-100 text-amber-700" },
  disabled: { label: "Disabled", className: "bg-red-100 text-red-600" },
};

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ── Shared form field ─────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
    />
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: UserRole;
  onChange: (r: UserRole) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white transition"
    >
      <option value="member">Member</option>
      <option value="manager">Manager</option>
      <option value="admin">Admin</option>
    </select>
  );
}

// ── Invite modal ──────────────────────────────────────────────

function InviteModal({
  currentUserId,
  onClose,
  onInvited,
}: {
  currentUserId: string;
  onClose: () => void;
  onInvited: (invite: PendingInvite) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !fullName.trim()) {
      setError("Name and email are required.");
      return;
    }
    setLoading(true);
    try {
      const invite = await dbCreateInvite({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        invitedBy: currentUserId,
      });
      onInvited(invite);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Invite user
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <Field label="Full name">
            <TextInput value={fullName} onChange={setFullName} placeholder="Alex Johnson" required />
          </Field>
          <Field label="Email">
            <TextInput value={email} onChange={setEmail} type="email" placeholder="alex@example.com" required />
          </Field>
          <Field label="Role">
            <RoleSelect value={role} onChange={setRole} />
          </Field>

          <p className="text-xs text-slate-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            An invite record will be created. The user must sign up with this email address to claim their account.
            {" "}
            <span className="font-medium text-amber-700">Email delivery requires Supabase SMTP configuration.</span>
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit user modal ───────────────────────────────────────────

function EditUserModal({
  user,
  currentUserId,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  currentUserId: string;
  onClose: () => void;
  onSaved: (updated: UserProfile) => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = user.id === currentUserId;
  // Prevent the last admin from removing their own admin role
  const [adminCount, setAdminCount] = useState<number | null>(null);

  useEffect(() => {
    dbAdminCount().then(setAdminCount).catch(() => setAdminCount(null));
  }, []);

  const wouldLockOut = isSelf && user.role === "admin" && role !== "admin" && adminCount === 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError("Name is required."); return; }
    if (wouldLockOut) { setError("You are the only admin. Assign another admin first."); return; }
    setLoading(true);
    try {
      await dbUpdateProfile(user.id, { fullName: fullName.trim(), role });
      onSaved({ ...user, fullName: fullName.trim(), role, updatedAt: new Date().toISOString() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Edit user</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {/* Read-only info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Avatar
              owner={{
                name: user.fullName,
                initials: generateInitials(user.fullName),
                color: getAvatarColor(user.fullName),
              }}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
              <StatusBadge status={user.status} />
            </div>
          </div>

          <Field label="Full name">
            <TextInput value={fullName} onChange={setFullName} placeholder="Full name" required />
          </Field>

          <Field label="Role">
            <RoleSelect value={role} onChange={setRole} />
            {wouldLockOut && (
              <p className="text-xs text-amber-700 mt-1">
                You are the only admin. Assign another admin before changing your own role.
              </p>
            )}
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || wouldLockOut}
              className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Row actions menu ──────────────────────────────────────────

function ProfileActionsMenu({
  user,
  currentUserId,
  adminCount,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  user: UserProfile;
  currentUserId: string;
  adminCount: number;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false), open);

  const { refs, floatingStyles } = useFloating({
    open,
    strategy: "fixed",
    placement: "bottom-end",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const isSelf = user.id === currentUserId;
  const isLastAdmin = user.role === "admin" && adminCount <= 1;
  const canDisable = !isSelf && !isLastAdmin;
  const canDelete  = !isSelf && !isLastAdmin;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        ref={refs.setReference}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[9999] bg-white rounded-xl shadow-lg border border-slate-200 min-w-[160px] py-1"
        >
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Edit user
          </button>

          {canDisable && (
            <button
              onClick={() => { setOpen(false); onToggleStatus(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {user.status === "disabled" ? (
                <><UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Re-enable</>
              ) : (
                <><UserX className="w-3.5 h-3.5 text-amber-500" /> Disable</>
              )}
            </button>
          )}

          {canDelete && (
            <>
              <hr className="my-1 border-slate-100" />
              <button
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function InviteActionsMenu({
  onCancel,
}: {
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false), open);

  const { refs, floatingStyles } = useFloating({
    open,
    strategy: "fixed",
    placement: "bottom-end",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        ref={refs.setReference}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[9999] bg-white rounded-xl shadow-lg border border-slate-200 min-w-[160px] py-1"
        >
          <button
            onClick={() => { setOpen(false); onCancel(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cancel invite
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export function UsersPage() {
  const { profile: currentProfile } = useAuthStore();
  const admin = isAdmin(currentProfile);

  const [profiles, setProfiles]       = useState<UserProfile[]>([]);
  const [invites, setInvites]         = useState<PendingInvite[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [adminCount, setAdminCount]   = useState(0);

  const [showInvite, setShowInvite]   = useState(false);
  const [editUser, setEditUser]       = useState<UserProfile | null>(null);
  const [deleteUser, setDeleteUser]   = useState<UserProfile | null>(null);
  const [cancelInvite, setCancelInvite] = useState<PendingInvite | null>(null);
  const [toggleUser, setToggleUser]   = useState<UserProfile | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, i, ac] = await Promise.all([
        loadProfiles(),
        loadPendingInvites(),
        dbAdminCount(),
      ]);
      setProfiles(p);
      setInvites(i);
      setAdminCount(ac);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Non-admin guard ──────────────────────────────────────────
  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800 mb-1">Access restricted</p>
          <p className="text-xs text-slate-400">Only admins can manage users.</p>
        </div>
      </div>
    );
  }

  // ── Filtered rows ────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredProfiles = profiles.filter(
    (p) => !q || p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
  const filteredInvites = invites.filter(
    (i) => !q || i.fullName.toLowerCase().includes(q) || i.email.toLowerCase().includes(q)
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleProfileSaved = (updated: UserProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (updated.role === "admin") setAdminCount((c) => c + 1);
    if (editUser?.role === "admin" && updated.role !== "admin") setAdminCount((c) => Math.max(0, c - 1));
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const next = user.status === "disabled" ? "active" : "disabled";
    try {
      await dbUpdateProfile(user.id, { status: next });
      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, status: next } : p))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const handleDeleteProfile = async (user: UserProfile) => {
    try {
      await dbDeleteProfile(user.id);
      setProfiles((prev) => prev.filter((p) => p.id !== user.id));
      if (user.role === "admin") setAdminCount((c) => Math.max(0, c - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const handleCancelInvite = async (invite: PendingInvite) => {
    try {
      await dbDeleteInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    }
  };

  const totalCount = profiles.length + invites.length;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} {totalCount === 1 ? "user" : "users"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Invite user
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filteredProfiles.length === 0 && filteredInvites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {search ? "No users match your search." : "No users yet."}
            </p>
            {!search && (
              <p className="text-xs text-slate-400">Invite someone to get started.</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                  Joined
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Active/disabled profiles */}
              {filteredProfiles.map((user) => (
                <tr
                  key={user.id}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    user.status === "disabled" && "opacity-60"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        owner={{
                          name: user.fullName,
                          initials: generateInitials(user.fullName),
                          color: getAvatarColor(user.fullName),
                          avatar: user.avatarUrl ?? undefined,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {user.fullName}
                          {user.id === currentProfile?.id && (
                            <span className="ml-1.5 text-[10px] font-semibold text-blue-500 bg-blue-50 rounded px-1 py-0.5">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 sm:hidden truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-slate-600 truncate">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-slate-400">{formatRelativeTime(user.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ProfileActionsMenu
                      user={user}
                      currentUserId={currentProfile!.id}
                      adminCount={adminCount}
                      onEdit={() => setEditUser(user)}
                      onToggleStatus={() => setToggleUser(user)}
                      onDelete={() => setDeleteUser(user)}
                    />
                  </td>
                </tr>
              ))}

              {/* Pending invites */}
              {filteredInvites.map((invite) => (
                <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        owner={{
                          name: invite.fullName || invite.email,
                          initials: generateInitials(invite.fullName || invite.email),
                          color: getAvatarColor(invite.email),
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {invite.fullName || invite.email}
                        </p>
                        <p className="text-xs text-slate-400 sm:hidden truncate">{invite.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-slate-600 truncate">{invite.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={invite.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status="invited" />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-slate-400">{formatRelativeTime(invite.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <InviteActionsMenu onCancel={() => setCancelInvite(invite)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showInvite && currentProfile && (
        <InviteModal
          currentUserId={currentProfile.id}
          onClose={() => setShowInvite(false)}
          onInvited={(inv) => setInvites((prev) => [...prev, inv])}
        />
      )}

      {editUser && currentProfile && (
        <EditUserModal
          user={editUser}
          currentUserId={currentProfile.id}
          onClose={() => setEditUser(null)}
          onSaved={handleProfileSaved}
        />
      )}

      {toggleUser && (
        <ConfirmDialog
          title={toggleUser.status === "disabled" ? "Re-enable user" : "Disable user"}
          message={
            toggleUser.status === "disabled"
              ? `Re-enable ${toggleUser.fullName}? They will be able to sign in again.`
              : `Disable ${toggleUser.fullName}? They will not be able to sign in until re-enabled.`
          }
          confirmLabel={toggleUser.status === "disabled" ? "Re-enable" : "Disable"}
          danger={toggleUser.status !== "disabled"}
          onConfirm={() => { handleToggleStatus(toggleUser); setToggleUser(null); }}
          onCancel={() => setToggleUser(null)}
        />
      )}

      {deleteUser && (
        <ConfirmDialog
          title="Delete user"
          message={`Permanently delete ${deleteUser.fullName}? This removes their profile from the app. Their Supabase auth account may persist and can be cleaned up via the Supabase dashboard.`}
          confirmLabel="Delete user"
          onConfirm={() => { handleDeleteProfile(deleteUser); setDeleteUser(null); }}
          onCancel={() => setDeleteUser(null)}
        />
      )}

      {cancelInvite && (
        <ConfirmDialog
          title="Cancel invite"
          message={`Cancel the invite for ${cancelInvite.email}? They will no longer be able to join with this invite.`}
          confirmLabel="Cancel invite"
          onConfirm={() => { handleCancelInvite(cancelInvite); setCancelInvite(null); }}
          onCancel={() => setCancelInvite(null)}
        />
      )}
    </div>
  );
}
