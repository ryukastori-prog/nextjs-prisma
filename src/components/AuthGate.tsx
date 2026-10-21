import { ReactNode, useEffect, useState } from "react";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [inputEmail, setInputEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null))
      .finally(() => setChecking(false));
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inputEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPassword("");
      setEmail(data.email);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setEmail(null);
  };

  if (checking) {
    return (
      <p className="min-h-screen bg-gray-50 p-6 text-sm text-gray-500">
        ⏳ 読み込み中...
      </p>
    );
  }

  if (!email) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-indigo-600 text-white px-4 py-4 shadow">
          <h1 className="text-xl font-bold">📚 MangaSync</h1>
          <p className="text-xs text-indigo-100">漫画原作バージョン管理ツール</p>
        </header>
        <div className="max-w-sm mx-auto p-4 space-y-3">
          <h2 className="font-bold pt-2">
            {mode === "login" ? "🔐 ログイン" : "✨ 新規登録"}
          </h2>
          {error && (
            <p className="rounded-lg bg-red-50 text-red-700 text-sm p-3">
              ⚠️ {error}
            </p>
          )}
          <input
            type="email"
            autoComplete="email"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            placeholder="メールアドレス"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          />
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="パスワード（8文字以上）"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm disabled:opacity-40"
          >
            {mode === "login" ? "ログイン" : "登録してはじめる"}
          </button>
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="w-full text-xs text-indigo-600 py-1"
          >
            {mode === "login"
              ? "アカウントがない方は新規登録"
              : "登録済みの方はログイン"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="bg-gray-100 text-xs text-gray-600 px-4 py-1 flex items-center justify-between">
        <span>👤 {email}</span>
        <button onClick={logout} className="text-indigo-600">
          ログアウト
        </button>
      </div>
      {children}
    </>
  );
}
