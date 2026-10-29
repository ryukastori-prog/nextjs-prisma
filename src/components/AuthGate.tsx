import { ReactNode, useEffect, useState } from "react";

const ERRORS: Record<string, string> = {
  config: "ログインの設定がまだ完了していません",
  state: "ログインを確認できませんでした。もう一度お試しください",
  login: "ログインに失敗しました。もう一度お試しください",
};

export default function AuthGate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) {
      setError(ERRORS[code] ?? ERRORS.login);
      window.history.replaceState(null, "", window.location.pathname);
    }
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null))
      .finally(() => setChecking(false));
  }, []);

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
          <h2 className="font-bold pt-2">🔐 ログイン</h2>
          {error && (
            <p className="rounded-lg bg-red-50 text-red-700 text-sm p-3">
              ⚠️ {error}
            </p>
          )}
          <a
            href="/api/auth/google"
            className="block w-full text-center rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium shadow-sm"
          >
            🔑 Google でログイン / 登録
          </a>
          <p className="text-xs text-gray-500">
            パスワードはこのアプリでは保存しません。初めての方は、ログインすると自動で登録されます。
          </p>
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
