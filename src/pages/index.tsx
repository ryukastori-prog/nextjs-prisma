import { useEffect, useState } from "react";
import LineDiff from "../components/LineDiff";
import CharacterPanel from "../components/CharacterPanel";

type Version = {
  id: string;
  number: number;
  note: string;
  text: string;
  createdAt: string;
};

type OutlineVersion = {
  id: string;
  number: number;
  note: string;
  data: string;
  createdAt: string;
};

type Episode = {
  id: string;
  title: string;
  status: string;
  outline: string;
  versions: Version[];
  outlineVersions: OutlineVersion[];
};

type Scene = { title: string; body: string };
type Outline = {
  synopsis: string;
  ki: string;
  sho: string;
  ten: string;
  ketsu: string;
  scenes: Scene[];
};

const emptyOutline: Outline = {
  synopsis: "",
  ki: "",
  sho: "",
  ten: "",
  ketsu: "",
  scenes: [],
};

const ACTS: { key: "ki" | "sho" | "ten" | "ketsu"; label: string; hint: string }[] = [
  { key: "ki", label: "起", hint: "導入：場面・人物・状況の提示" },
  { key: "sho", label: "承", hint: "展開：事態が動き出す" },
  { key: "ten", label: "転", hint: "転換：山場・予想外の出来事" },
  { key: "ketsu", label: "結", hint: "結末：決着と次への引き" },
];

const parseOutline = (raw: string): Outline => {
  try {
    const o = JSON.parse(raw);
    const str = (v: unknown) => String(v ?? "");
    return {
      synopsis: str(o.synopsis),
      ki: str(o.ki),
      sho: str(o.sho),
      ten: str(o.ten),
      ketsu: str(o.ketsu),
      scenes: Array.isArray(o.scenes)
        ? o.scenes.map((s: { title?: unknown; body?: unknown }) => ({
            title: str(s?.title),
            body: str(s?.body),
          }))
        : [],
    };
  } catch {
    return emptyOutline;
  }
};

const STATUSES = ["執筆中", "確定", "ネーム待ち"];

const statusStyle: Record<string, string> = {
  執筆中: "bg-yellow-100 text-yellow-800",
  確定: "bg-green-100 text-green-800",
  ネーム待ち: "bg-blue-100 text-blue-800",
};

const formatDate = (iso: string) => iso.slice(0, 10);

// 文字数（空白・改行を除く）と、改行を含む文字数
const countChars = (text: string) => countAll(text.replace(/\s/g, ""));
const countAll = (text: string) => Array.from(text).length;

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
  const [query, setQuery] = useState("");
  const [outline, setOutline] = useState<Outline>(emptyOutline);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineNote, setOutlineNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

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

  useEffect(() => {
    const ep = episodes.find((e) => e.id === episodeId);
    setOutline(parseOutline(ep?.outline ?? ""));
    setOutlineNote("");
    setHistoryOpen(false);
  }, [episodeId]);

  const episode = episodes.find((e) => e.id === episodeId);
  const current = episode?.versions[versionIndex];
  const previous = episode?.versions[versionIndex + 1];

  const keyword = query.trim().toLowerCase();
  const searching = keyword !== "";
  const matchesText = (e: Episode) =>
    e.versions.some((v) => v.text.toLowerCase().includes(keyword));
  const visibleEpisodes = searching
    ? episodes.filter(
        (e) => e.title.toLowerCase().includes(keyword) || matchesText(e)
      )
    : episodes;

  const moveEpisode = async (id: string, dir: -1 | 1) => {
    if (saving || searching) return;
    const i = episodes.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= episodes.length) return;
    const next = [...episodes];
    [next[i], next[j]] = [next[j], next[i]];
    setEpisodes(next);
    try {
      await send("/api/episodes", "PATCH", { order: next.map((e) => e.id) });
    } catch {
      setError("並べ替えを保存できませんでした");
      await load(episodeId);
    }
  };

  const outlineDirty =
    !!episode &&
    JSON.stringify(outline) !== JSON.stringify(parseOutline(episode.outline));

  const setScene = (i: number, patch: Partial<Scene>) =>
    setOutline({
      ...outline,
      scenes: outline.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)),
    });

  const addScene = () =>
    setOutline({ ...outline, scenes: [...outline.scenes, { title: "", body: "" }] });

  const removeScene = (i: number) =>
    setOutline({ ...outline, scenes: outline.scenes.filter((_, k) => k !== i) });

  const moveScene = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= outline.scenes.length) return;
    const scenes = [...outline.scenes];
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
    setOutline({ ...outline, scenes });
  };

  const saveOutline = async () => {
    if (!episode || saving) return;
    setSaving(true);
    try {
      const saved = await send("/api/episodes", "PATCH", {
        id: episode.id,
        outline,
        note: outlineNote,
      });
      setEpisodes(
        episodes.map((e) =>
          e.id === episode.id
            ? {
                ...e,
                outline: saved.outline,
                outlineVersions: saved.version
                  ? [saved.version, ...e.outlineVersions]
                  : e.outlineVersions,
              }
            : e
        )
      );
      setOutlineNote("");
      setError("");
    } catch {
      setError("構成を保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const insertOutlineToDraft = () => {
    const parts: string[] = [];
    if (outline.synopsis.trim()) parts.push(`【あらすじ】\n${outline.synopsis.trim()}`);
    ACTS.forEach((a) => {
      if (outline[a.key].trim()) parts.push(`【${a.label}】\n${outline[a.key].trim()}`);
    });
    outline.scenes.forEach((s, i) => {
      if (s.title.trim() || s.body.trim()) {
        parts.push(`【シーン${i + 1}${s.title.trim() ? "：" + s.title.trim() : ""}】\n${s.body.trim()}`);
      }
    });
    if (parts.length === 0) return;
    if (
      draftText.trim() &&
      !window.confirm("入力欄の本文を、構成から作った下書きで置き換えます。よろしいですか？")
    )
      return;
    setDraftText(parts.join("\n\n") + "\n");
  };

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

  const restoreVersion = async () => {
    if (!episode || !current || saving) return;
    setSaving(true);
    try {
      await send("/api/versions", "POST", {
        episodeId: episode.id,
        note: `v${current.number} に戻す`,
        text: current.text,
      });
      await load(episode.id);
    } catch {
      setError("バージョンを戻せませんでした");
    } finally {
      setSaving(false);
    }
  };

  const deleteVersion = async () => {
    if (!episode || !current || saving) return;
    if (!window.confirm(`v${current.number} を削除します。元に戻せません。よろしいですか？`)) return;
    setSaving(true);
    try {
      await send("/api/versions", "DELETE", { id: current.id });
      await load(episode.id);
    } catch {
      setError("バージョンを削除できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const deleteEpisode = async () => {
    if (!episode || saving) return;
    if (!window.confirm(`「${episode.title}」とすべてのバージョンを削除します。元に戻せません。よろしいですか？`)) return;
    setSaving(true);
    try {
      await send("/api/episodes", "DELETE", { id: episode.id });
      await load("");
    } catch {
      setError("エピソードを削除できませんでした");
    } finally {
      setSaving(false);
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
          {episodes.length > 0 && (
            <div className="relative mb-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔎 タイトル・本文から検索"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="検索をクリア"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-gray-500">⏳ 読み込み中...</p>
          ) : (
            <div className="space-y-2">
              {visibleEpisodes.map((e) => {
                const idx = episodes.findIndex((x) => x.id === e.id);
                const latest = e.versions[0]?.text ?? "";
                return (
                  <div
                    key={e.id}
                    className={`flex items-stretch rounded-xl border bg-white ${
                      e.id === episodeId
                        ? "border-indigo-500 shadow"
                        : "border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() => selectEpisode(e)}
                      className="flex-1 min-w-0 text-left p-3 flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium truncate">
                          {e.title}
                        </span>
                        <span className="block text-[11px] text-gray-400">
                          {countChars(latest).toLocaleString()}文字
                          {searching &&
                            !e.title.toLowerCase().includes(keyword) &&
                            " ・本文に一致"}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                          statusStyle[e.status] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {e.status}
                      </span>
                    </button>
                    {!searching && episodes.length > 1 && (
                      <div className="flex flex-col border-l border-gray-100">
                        <button
                          onClick={() => moveEpisode(e.id, -1)}
                          disabled={idx === 0 || saving}
                          aria-label="上へ"
                          className="flex-1 px-3 text-gray-500 disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveEpisode(e.id, 1)}
                          disabled={idx === episodes.length - 1 || saving}
                          aria-label="下へ"
                          className="flex-1 px-3 text-gray-500 border-t border-gray-100 disabled:opacity-20"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {episodes.length === 0 && (
                <p className="text-sm text-gray-500">
                  🌱 まだエピソードがありません。下から追加してください
                </p>
              )}
              {episodes.length > 0 && visibleEpisodes.length === 0 && (
                <p className="text-sm text-gray-500">
                  🔎 「{query.trim()}」に一致するエピソードはありません
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

        <CharacterPanel />

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
              <button
                onClick={deleteEpisode}
                disabled={saving}
                className="ml-auto text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 disabled:opacity-40"
              >
                🗑️ エピソード削除
              </button>
            </section>

            <section className="bg-white rounded-xl border border-gray-200">
              <button
                onClick={() => setOutlineOpen(!outlineOpen)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="font-bold text-sm">
                  📐 シナリオ構成
                  {outlineDirty && (
                    <span className="ml-2 text-[11px] font-normal text-orange-600">
                      未保存
                    </span>
                  )}
                </span>
                <span className="text-gray-400 text-sm">{outlineOpen ? "▲" : "▼"}</span>
              </button>
              {outlineOpen && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-500">📝 あらすじ</span>
                    <textarea
                      value={outline.synopsis}
                      onChange={(e) => setOutline({ ...outline, synopsis: e.target.value })}
                      rows={3}
                      placeholder="この話の概要を数行で"
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                    />
                  </label>
                  {ACTS.map((a) => (
                    <label key={a.key} className="block">
                      <span className="text-xs font-bold text-gray-500">
                        【{a.label}】
                        <span className="font-normal text-gray-400"> {a.hint}</span>
                      </span>
                      <textarea
                        value={outline[a.key]}
                        onChange={(e) => setOutline({ ...outline, [a.key]: e.target.value })}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                      />
                    </label>
                  ))}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">🎬 シーン割り</p>
                    <div className="space-y-2">
                      {outline.scenes.map((s, i) => (
                        <div key={i} className="rounded-lg border border-gray-200 p-2 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                            <input
                              value={s.title}
                              onChange={(e) => setScene(i, { title: e.target.value })}
                              placeholder="シーン名（例：廃屋での再会）"
                              className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                            <button
                              onClick={() => moveScene(i, -1)}
                              disabled={i === 0}
                              aria-label="上へ"
                              className="px-2 text-gray-500 disabled:opacity-20"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveScene(i, 1)}
                              disabled={i === outline.scenes.length - 1}
                              aria-label="下へ"
                              className="px-2 text-gray-500 disabled:opacity-20"
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => removeScene(i)}
                              aria-label="削除"
                              className="px-2 text-red-500"
                            >
                              ✕
                            </button>
                          </div>
                          <textarea
                            value={s.body}
                            onChange={(e) => setScene(i, { body: e.target.value })}
                            rows={2}
                            placeholder="場所・登場人物・出来事・セリフの案"
                            className="w-full rounded border border-gray-300 p-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addScene}
                      className="mt-2 text-xs border border-indigo-200 text-indigo-700 rounded-lg px-3 py-1.5"
                    >
                      ➕ シーンを追加
                    </button>
                  </div>
                  <input
                    value={outlineNote}
                    onChange={(e) => setOutlineNote(e.target.value)}
                    placeholder="構成の変更メモ（例：転の展開を変更）"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={saveOutline}
                      disabled={saving || !outlineDirty}
                      className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-40"
                    >
                      💾 構成を保存
                    </button>
                    <button
                      onClick={insertOutlineToDraft}
                      className="rounded-lg border border-indigo-200 text-indigo-700 px-4 py-2 text-sm"
                    >
                      ✍️ 構成から本文の下書きを作る
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-2">
                    <button
                      onClick={() => setHistoryOpen(!historyOpen)}
                      className="text-xs font-bold text-gray-500"
                    >
                      🕒 構成の履歴（{episode.outlineVersions.length}件）{historyOpen ? "▲" : "▼"}
                    </button>
                    {historyOpen && (
                      <div className="mt-2 space-y-2">
                        {episode.outlineVersions.length === 0 && (
                          <p className="text-xs text-gray-400">
                            まだ履歴がありません。「構成を保存」すると記録されます
                          </p>
                        )}
                        {episode.outlineVersions.map((v, i) => {
                          const isCurrent =
                            JSON.stringify(parseOutline(v.data)) === JSON.stringify(outline);
                          return (
                            <div
                              key={v.id}
                              className="rounded-lg border border-gray-200 p-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold">
                                  構成 v{v.number}
                                  <span className="ml-2 font-normal text-gray-400">
                                    {formatDate(v.createdAt)}
                                  </span>
                                  {i === 0 && (
                                    <span className="ml-2 text-[10px] text-indigo-600">最新</span>
                                  )}
                                </span>
                                <button
                                  onClick={() => setOutline(parseOutline(v.data))}
                                  disabled={isCurrent}
                                  className="shrink-0 border border-indigo-200 text-indigo-700 rounded-lg px-2 py-1 disabled:opacity-40"
                                >
                                  {isCurrent ? "表示中" : "↩️ 読み込む"}
                                </button>
                              </div>
                              <p className="text-gray-500 mt-1">📝 {v.note}</p>
                              <p className="text-gray-400 mt-1 truncate">
                                {parseOutline(v.data).synopsis || "（あらすじなし）"}
                              </p>
                            </div>
                          );
                        })}
                        {episode.outlineVersions.length > 0 && (
                          <p className="text-[11px] text-gray-400">
                            読み込むと入力欄に反映されます。「構成を保存」を押すと、新しい版として記録されます。
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              <p className="text-xs text-gray-500 mt-2">
                🔢 {countChars(current.text).toLocaleString()}文字
                <span className="text-gray-400">
                  （改行込み {countAll(current.text).toLocaleString()}）
                </span>
                {previous && (() => {
                  const d = countChars(current.text) - countChars(previous.text);
                  return (
                    <span className={d >= 0 ? "text-green-700" : "text-red-600"}>
                      {" "}・前の版から {d >= 0 ? "+" : ""}
                      {d.toLocaleString()}
                    </span>
                  );
                })()}
              </p>
              <div className="flex gap-2 mt-3">
                {versionIndex > 0 && (
                  <button
                    onClick={restoreVersion}
                    disabled={saving}
                    className="text-xs border border-indigo-200 text-indigo-700 rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    ↩️ この内容に戻す（新しい版として保存）
                  </button>
                )}
                {episode.versions.length > 1 && (
                  <button
                    onClick={deleteVersion}
                    disabled={saving}
                    className="text-xs border border-red-200 text-red-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    🗑️ この版を削除
                  </button>
                )}
              </div>
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
              <p className="text-xs text-gray-500">
                🔢 {countChars(draftText).toLocaleString()}文字
                <span className="text-gray-400">
                  （改行込み {countAll(draftText).toLocaleString()}）
                </span>
                {(() => {
                  const base = episode.versions[0]?.text ?? "";
                  const d = countChars(draftText) - countChars(base);
                  return d === 0 ? null : (
                    <span className={d > 0 ? "text-green-700" : "text-red-600"}>
                      {" "}・最新版から {d > 0 ? "+" : ""}
                      {d.toLocaleString()}
                    </span>
                  );
                })()}
              </p>
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
                <LineDiff
                  before={previous.text}
                  after={current.text}
                  beforeLabel={`v${previous.number}`}
                  afterLabel={`v${current.number}`}
                />
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
