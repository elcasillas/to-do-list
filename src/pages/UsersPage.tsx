import { useEffect, useRef, useState, useCallback } from "react";
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
  RefreshCw,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound,
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
import {
  loadProfiles,
  dbUpdateProfile,
  dbDeleteProfile,
  dbAdminCount,
  dbCreateUser,
  dbAdminUpdatePassword,
} from "../lib/db";
import { cn, formatRelativeTime, generateInitials, getAvatarColor } from "../lib/utils";
import type { UserProfile, UserRole } from "../types";

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

// ── Shared form primitives ────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
    />
  );
}

function RoleSelect({ value, onChange }: { value: UserRole; onChange: (r: UserRole) => void }) {
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

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder = "8+ characters",
  autoComplete = "new-password",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  );
}

// ── Add user modal ────────────────────────────────────────────

function AddUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (profile: UserProfile) => void;
}) {
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [role, setRole]             = useState<UserRole>("member");
  const [status, setStatus]         = useState<"active" | "disabled">("active");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const validate = (): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const profile = await dbCreateUser({ email: email.trim(), password, fullName, role, status });
      onCreated(profile);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create user.";
      setError(
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("registered")
          ? "A user with this email address already exists."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-900">Add user</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <TextInput
                value={firstName}
                onChange={setFirstName}
                placeholder="Alex"
                autoComplete="given-name"
                required
              />
            </Field>
            <Field label="Last name">
              <TextInput
                value={lastName}
                onChange={setLastName}
                placeholder="Johnson"
                autoComplete="family-name"
              />
            </Field>
          </div>

          <Field label="Email">
            <TextInput
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="alex@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <RoleSelect value={role} onChange={setRole} />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "disabled")}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white transition"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </Field>
          </div>

          {/* Password section */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Set password
            </p>
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
            />
            <PasswordInput
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
              placeholder="Repeat password"
            />
          </div>

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
              Create user
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
  const [fullName, setFullName]         = useState(user.fullName);
  const [role, setRole]                 = useState<UserRole>(user.role);
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const isSelf = user.id === currentUserId;
  const [adminCount, setAdminCount] = useState<number | null>(null);
  useEffect(() => {
    dbAdminCount().then(setAdminCount).catch(() => setAdminCount(null));
  }, []);

  const wouldLockOut = isSelf && user.role === "admin" && role !== "admin" && adminCount === 1;
  const passwordProvided = newPassword.length > 0 || confirmPw.length > 0;

  const validate = (): string | null => {
    if (!fullName.trim()) return "Name is required.";
    if (wouldLockOut) return "You are the only admin. Assign another admin before changing your own role.";
    if (passwordProvided) {
      if (newPassword.length < 8) return "New password must be at least 8 characters.";
      if (newPassword !== confirmPw) return "Passwords do not match.";
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      await dbUpdateProfile(user.id, { fullName: fullName.trim(), role });
      if (passwordProvided) {
        await dbAdminUpdatePassword(user.id, newPassword);
      }
      onSaved({ ...user, fullName: fullName.trim(), role, updatedAt: new Date().toISOString() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-900">Edit user</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Read-only identity */}
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
            <TextInput
              value={fullName}
              onChange={setFullName}
              placeholder="Full name"
              autoComplete="name"
              required
            />
          </Field>

          <Field label="Role">
            <RoleSelect value={role} onChange={setRole} />
            {wouldLockOut && (
              <p className="text-xs text-amber-700 mt-1">
                You are the only admin. Assign another admin before changing your own role.
              </p>
            )}
          </Field>

          {/* Password change — optional */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Change Password
              </p>
            </div>
            <p className="text-xs text-slate-400 -mt-2">
              Leave blank to keep the current password.
            </p>
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
            />
            <PasswordInput
              label="Confirm new password"
              value={confirmPw}
              onChange={setConfirmPw}
              show={showPw}
              onToggle={() => setShowPw((v) => !v)}
              placeholder="Repeat new password"
            />
          </div>

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
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Hook: close on outside click, aware of floating portal ────

function useFloatingClickOutside(
  refEl: React.RefObject<HTMLElement | null>,
  floatEl: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean
) {
  const handler = useCallback(
    (e: MouseEvent) => {
      if (
        refEl.current?.contains(e.target as Node) ||
        floatEl.current?.contains(e.target as Node)
      ) return;
      onClose();
    },
    [refEl, floatEl, onClose]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, handler]);
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

  const { refs, floatingStyles } = useFloating({
    open,
    strategy: "fixed",
    placement: "bottom-end",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const refEl   = useRef<HTMLElement | null>(null);
  const floatEl = useRef<HTMLElement | null>(null);
  useFloatingClickOutside(refEl, floatEl, () => setOpen(false), open);

  const isSelf      = user.id === currentUserId;
  const isLastAdmin = user.role === "admin" && adminCount <= 1;
  const canDisable  = !isSelf && !isLastAdmin;
  const canDelete   = !isSelf && !isLastAdmin;

  return (
    <div className="relative inline-block">
      <button
        ref={(el) => { refs.setReference(el); refEl.current = el; }}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={(el) => { refs.setFloating(el); floatEl.current = el; }}
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

// ── Main page ─────────────────────────────────────────────────

export function UsersPage() {
  const { profile: currentProfile } = useAuthStore();
  const admin = isAdmin(currentProfile);

  const [profiles, setProfiles]     = useState<UserProfile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [adminCount, setAdminCount] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<UserProfile | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [toggleUser, setToggleUser] = useState<UserProfile | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchTimeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out. Check your connection and try again.")),
          10_000
        )
      );
      const [p, ac] = await Promise.race([
        Promise.all([loadProfiles(), dbAdminCount()]),
        fetchTimeout,
      ]);
      setProfiles(p);
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

  const q = search.toLowerCase();
  const filteredProfiles = profiles.filter(
    (p) => !q || p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleUserCreated = (profile: UserProfile) => {
    setProfiles((prev) => [...prev, profile]);
    if (profile.role === "admin") setAdminCount((c) => c + 1);
  };

  const handleProfileSaved = (updated: UserProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (updated.role === "admin" && editUser?.role !== "admin") setAdminCount((c) => c + 1);
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

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {profiles.length} {profiles.length === 1 ? "user" : "users"} total
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
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add user
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

      {/* Error banner */}
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
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {search ? "No users match your search." : "No users yet."}
            </p>
            {!search && (
              <p className="text-xs text-slate-400">Add a user to get started.</p>
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
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <AddUserModal
          onClose={() => setShowCreate(false)}
          onCreated={handleUserCreated}
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
    </div>
  );
}
