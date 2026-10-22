import { useEffect, useState } from "react";

type Version = {
  id: string;
  number: number;
  note: string;
  text: string;
  createdAt: string;
};

type Episode = {
  id: string;
  title: string;
  status: string;
  versions: Version[];
};

const STATUSES = ["執筆中", "確定", "ネーム待ち"];

const statusStyle: Record<string, string> = {
  執筆中: "bg-yellow-100 text-yellow-800",
  確定: "bg-green-100 text-green-800",
  ネーム待ち: "bg-blue-100 text-blue-800",
};

const formatDate = (iso: string) => iso.slice(0, 10);

export default function Home() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [versionIndex, setVersionIndex] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (selectId?: string) => {
    try {
      const res = await fetch("/api/episodes");
      if (!res.ok) throw new Error();
      const data: Episode[] = await res.json();
      setEpisodes(data);
      const target = selectId ?? episodeId;
      const found = data.find((e) => e.id === target) ?? data[0];
      setEpisodeId(found ? found.id : "");
      setVersionIndex(0);
      setDraftText(found?.versions[0]?.text ?? "");
      setDraftNote("");
      setError("");
    } catch {
      setError("データを読み込めませんでした");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const episode = episodes.find((e) => e.id === episodeId);
  const current = episode?.versions[versionIndex];
  const previous = episode?.versions[versionIndex + 1];

  const selectEpisode = (e: Episode) => {
    setEpisodeId(e.id);
    setVersionIndex(0);
    setDraftText(e.versions[0]?.text ?? "");
    setDraftNote("");
  };

  const selectVersion = (i: number) => {
    setVersionIndex(i);
    setDraftText(episode?.versions[i]?.text ?? "");
  };

  const send = async (url: string, method: string, body: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    return res.json();
  };

  const addEpisode = async () => {
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const created = await send("/api/episodes", "POST", { title });
      setNewTitle("");
      await load(created.id);
    } catch {
      setError("エピソードを追加できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!episode) return;
    try {
      await send("/api/episodes", "PATCH", { id: episode.id, status });
      setEpisodes(
        episodes.map((e) => (e.id === episode.id ? { ...e, status } : e))
      );
    } catch {
      setError("ステータスを変更できませんでした");
    }
  };

  const saveVersion = async () => {
    if (!episode || saving) return;
    setSaving(true);
    try {
      await send("/api/versions", "POST", {
        episodeId: episode.id,
        note: draftNote,
        text: draftText,
      });
      await load(episode.id);
    } catch {
      setError("バージョンを保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-indigo-600 text-white px-4 py-4 shadow">
        <h1 className="text-xl font-bold">📚 MangaSync</h1>
        <p className="text-xs text-indigo-100">漫画原作バージョン管理ツール</p>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {error && (
          <p className="rounded-lg bg-red-50 text-red-700 text-sm p-3">
            ⚠️ {error}
          </p>
        )}

        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">📖 エピソード</h2>
          {loading ? (
            <p className="text-sm text-gray-500">⏳ 読み込み中...</p>
          ) : (
            <div className="space-y-2">
              {episodes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEpisode(e)}
                  className={`w-full text-left rounded-xl border p-3 flex items-center justify-between ${
                    e.id === episodeId
                      ? "border-indigo-500 bg-white shadow"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="font-medium">{e.title}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusStyle[e.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {e.status}
                  </span>
                </button>
              ))}
              {episodes.length === 0 && (
                <p className="text-sm text-gray-500">
                  🌱 まだエピソードがありません。下から追加してください
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="例：第4話 荒野の約束"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={addEpisode}
              disabled={saving || !newTitle.trim()}
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-40"
            >
              ➕ 追加
            </button>
          </div>
        </section>

        {episode && current && (
          <>
            <section className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">🏷️ ステータス</span>
              <select
                value={episode.status}
                onChange={(e) => changeStatus(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h2 className="text-sm font-bold text-gray-500 mb-2">
                🕒 バージョン履歴
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {episode.versions.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => selectVersion(i)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm border ${
                      i === versionIndex
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-200"
                    }`}
                  >
                    v{v.number}
                    <span className="block text-[10px] opacity-80">
                      {formatDate(v.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">✍️ v{current.number} の内容</h3>
                <span className="text-xs text-gray-500">📝 {current.note}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">
                {current.text || "（本文はまだありません）"}
              </p>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <h3 className="font-bold">💾 新しいバージョンとして保存</h3>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={8}
                placeholder="ここに原作の本文を書きます"
                className="w-full rounded-lg border border-gray-300 p-3 text-sm leading-relaxed"
              />
              <input
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="変更メモ（例：ラストのセリフを変更）"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={saveVersion}
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm disabled:opacity-40"
              >
                💾 v{(episode.versions[0]?.number ?? 0) + 1} として保存
              </button>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold mb-2">🔍 前バージョンとの比較</h3>
              {previous ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs font-bold text-red-700 mb-1">
                      ⬅️ v{previous.number}
                    </p>
                    <p className="whitespace-pre-wrap">{previous.text}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs font-bold text-green-700 mb-1">
                      ➡️ v{current.number}
                    </p>
                    <p className="whitespace-pre-wrap">{current.text}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  🌱 これが最初のバージョンです（比較対象なし）
                </p>
              )}
            </section>
          </>
        )}

        <p className="text-center text-xs text-gray-400 pt-2">
          🚧 開発中：機能を順次追加しています
        </p>
      </div>
    </main>
  );
}
