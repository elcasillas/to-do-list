import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckSquare } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { cn } from "../../lib/utils";

type AuthMode = "login" | "signup" | "forgot";

// ── Shared field component ────────────────────────────────────

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  rightSlot,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full px-3.5 py-2.5 text-sm text-slate-800 border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition pr-10"
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────

function LoginForm({ onSwitch }: { onSwitch: (m: AuthMode) => void }) {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        type={showPw ? "text" : "password"}
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Sign in
      </button>

      <div className="flex items-center justify-between text-sm pt-1">
        <button
          type="button"
          onClick={() => onSwitch("forgot")}
          className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Forgot password?
        </button>
        <button
          type="button"
          onClick={() => onSwitch("signup")}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          Create account →
        </button>
      </div>
    </form>
  );
}

// ── Sign-up form ──────────────────────────────────────────────

function SignupForm({ onSwitch }: { onSwitch: (m: AuthMode) => void }) {
  const { signUp } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const err = await signUp(email.trim(), password, fullName.trim());
    if (err) { setError(err); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckSquare className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-800">Check your email</p>
        <p className="text-sm text-slate-500">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <button
          onClick={() => onSwitch("login")}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Full name"
        value={fullName}
        onChange={setFullName}
        placeholder="Alex Johnson"
        autoComplete="name"
      />
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        type={showPw ? "text" : "password"}
        value={password}
        onChange={setPassword}
        placeholder="8+ characters"
        autoComplete="new-password"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password || !fullName}
        className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Create account
      </button>

      <p className="text-sm text-center text-slate-500 pt-1">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── Forgot-password form ──────────────────────────────────────

function ForgotForm({ onSwitch }: { onSwitch: (m: AuthMode) => void }) {
  const { sendPasswordReset } = useAuthStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await sendPasswordReset(email.trim());
    if (err) { setError(err); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center space-y-3 py-4">
        <p className="text-sm font-semibold text-slate-800">Reset email sent</p>
        <p className="text-sm text-slate-500">
          Check <strong>{email}</strong> for a password reset link.
        </p>
        <button
          onClick={() => onSwitch("login")}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-500">
        Enter your email and we'll send a link to reset your password.
      </p>
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Send reset link
      </button>

      <button
        type="button"
        onClick={() => onSwitch("login")}
        className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        ← Back to sign in
      </button>
    </form>
  );
}

// ── Reset-password form (shown after clicking reset link) ─────

export function ResetPasswordPage() {
  const { updatePassword } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const err = await updatePassword(password);
    if (err) { setError(err); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  };

  return (
    <AuthCard title="Set new password" subtitle="Choose a strong password for your account.">
      {done ? (
        <div className="text-center py-4 text-sm text-emerald-700 font-medium">
          Password updated! Signing you in…
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="New password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="8+ characters"
            autoComplete="new-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <Field
            label="Confirm password"
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat password"
            autoComplete="new-password"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </button>
        </form>
      )}
    </AuthCard>
  );
}

// ── Auth card shell ───────────────────────────────────────────

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/To-Do-List-logo.png" alt="To Do List" className="h-10 w-auto" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main auth page ────────────────────────────────────────────

const TITLES: Record<AuthMode, { title: string; subtitle: string }> = {
  login: { title: "Welcome back", subtitle: "Sign in to your account." },
  signup: { title: "Create an account", subtitle: "Get started with To Do List." },
  forgot: { title: "Forgot password", subtitle: "" },
};

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const { title, subtitle } = TITLES[mode];

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <div
        className={cn(
          "transition-all duration-150",
          mode === "login" ? "block" : "hidden"
        )}
      >
        <LoginForm onSwitch={setMode} />
      </div>
      <div className={cn(mode === "signup" ? "block" : "hidden")}>
        <SignupForm onSwitch={setMode} />
      </div>
      <div className={cn(mode === "forgot" ? "block" : "hidden")}>
        <ForgotForm onSwitch={setMode} />
      </div>
    </AuthCard>
  );
}
