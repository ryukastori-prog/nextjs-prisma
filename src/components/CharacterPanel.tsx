import { useEffect, useState } from "react";

type Character = {
  id: string;
  name: string;
  role: string;
  personality: string;
  appearance: string;
  memo: string;
};

type Form = Omit<Character, "id"> & { id: string };

const ROLES = ["主人公", "ヒロイン", "ライバル", "敵役", "仲間", "脇役", "その他"];

const emptyForm: Form = {
  id: "",
  name: "",
  role: "",
  personality: "",
  appearance: "",
  memo: "",
};

const roleStyle: Record<string, string> = {
  主人公: "bg-indigo-100 text-indigo-800",
  ヒロイン: "bg-pink-100 text-pink-800",
  ライバル: "bg-orange-100 text-orange-800",
  敵役: "bg-red-100 text-red-800",
  仲間: "bg-green-100 text-green-800",
};

export type Appearance = {
  episodeId: string;
  episodeTitle: string;
  no: number;
  title: string;
};

export default function CharacterPanel({
  onChange,
  appearances,
  onOpenEpisode,
}: {
  onChange?: (list: { id: string; name: string; role: string }[]) => void;
  appearances?: Record<string, Appearance[]>;
  onOpenEpisode?: (episodeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [expandedId, setExpandedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/characters");
      if (!res.ok) throw new Error();
      const list: Character[] = await res.json();
      setCharacters(list);
      onChange?.(list.map((c) => ({ id: c.id, name: c.name, role: c.role })));
      setError("");
    } catch {
      setError("キャラクターを読み込めませんでした");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async (method: string, body: unknown) => {
    const res = await fetch("/api/characters", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    return res.json();
  };

  const save = async () => {
    if (!form || !form.name.trim() || saving) return;
    setSaving(true);
    try {
      if (form.id) {
        await send("PATCH", form);
      } else {
        await send("POST", form);
      }
      setForm(null);
      await load();
    } catch {
      setError("キャラクターを保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Character) => {
    if (saving) return;
    if (!window.confirm(`「${c.name}」を削除します。元に戻せません。よろしいですか？`)) return;
    setSaving(true);
    try {
      await send("DELETE", { id: c.id });
      if (form?.id === c.id) setForm(null);
      await load();
    } catch {
      setError("キャラクターを削除できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Form, label: string, rows: number, placeholder: string) => (
    <label className="block">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <textarea
        value={form ? form[key] : ""}
        onChange={(e) => form && setForm({ ...form, [key]: e.target.value })}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
      />
    </label>
  );

  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="font-bold text-sm">
          👥 キャラクター設定
          {loaded && (
            <span className="ml-2 text-[11px] font-normal text-gray-400">
              {characters.length}人
            </span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
          {error && (
            <p className="rounded-lg bg-red-50 text-red-700 text-xs p-2">
              ⚠️ {error}
            </p>
          )}

          {!loaded && <p className="text-sm text-gray-500">⏳ 読み込み中...</p>}

          {loaded && characters.length === 0 && !form && (
            <p className="text-sm text-gray-500">
              🌱 まだキャラクターがいません。下から追加してください
            </p>
          )}

          <div className="space-y-2">
            {characters.map((c) => {
              const expanded = expandedId === c.id;
              return (
                <div key={c.id} className="rounded-lg border border-gray-200">
                  <button
                    onClick={() => setExpandedId(expanded ? "" : c.id)}
                    className="w-full flex items-center justify-between gap-2 p-2 text-left"
                  >
                    <span className="font-medium text-sm truncate">{c.name}</span>
                    {c.role && (
                      <span
                        className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full ${
                          roleStyle[c.role] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.role}
                      </span>
                    )}
                  </button>
                  {expanded && (
                    <div className="px-2 pb-2 space-y-2 text-sm">
                      {c.personality && (
                        <p className="whitespace-pre-wrap">
                          <span className="text-xs font-bold text-gray-500">性格・口調　</span>
                          {c.personality}
                        </p>
                      )}
                      {c.appearance && (
                        <p className="whitespace-pre-wrap">
                          <span className="text-xs font-bold text-gray-500">外見　</span>
                          {c.appearance}
                        </p>
                      )}
                      {c.memo && (
                        <p className="whitespace-pre-wrap">
                          <span className="text-xs font-bold text-gray-500">メモ　</span>
                          {c.memo}
                        </p>
                      )}
                      {!c.personality && !c.appearance && !c.memo && (
                        <p className="text-xs text-gray-400">（詳細はまだありません）</p>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-500">🎬 登場シーン</p>
                        {(appearances?.[c.id] ?? []).length === 0 ? (
                          <p className="text-xs text-gray-400 mt-1">
                            まだ登場するシーンがありません（📐 構成のシーンで「登場」を選び、保存すると表示されます）
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {(appearances?.[c.id] ?? []).map((a, k) => (
                              <li key={k}>
                                <button
                                  onClick={() => onOpenEpisode?.(a.episodeId)}
                                  className="w-full text-left text-xs rounded-lg border border-gray-200 px-2 py-1.5"
                                >
                                  <span className="font-medium">{a.episodeTitle}</span>
                                  <span className="text-gray-500">
                                    {" "}
                                    ・シーン{a.no}
                                    {a.title ? `：${a.title}` : ""}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForm({ ...c })}
                          className="text-xs border border-indigo-200 text-indigo-700 rounded-lg px-3 py-1.5"
                        >
                          ✏️ 編集
                        </button>
                        <button
                          onClick={() => remove(c)}
                          disabled={saving}
                          className="text-xs border border-red-200 text-red-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {form ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3 space-y-2">
              <p className="text-xs font-bold text-indigo-700">
                {form.id ? "✏️ キャラクターを編集" : "➕ 新しいキャラクター"}
              </p>
              <label className="block">
                <span className="text-xs font-bold text-gray-500">名前</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例：ガルシア"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div>
                <span className="text-xs font-bold text-gray-500">立ち位置</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setForm({ ...form, role: form.role === r ? "" : r })}
                      className={`text-xs rounded-full px-3 py-1 border ${
                        form.role === r
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {field("personality", "性格・口調", 2, "例：陽気だが執念深い。語尾は「〜だぜ」")}
              {field("appearance", "外見", 2, "例：長身、褐色の肌、左頬に傷")}
              {field("memo", "メモ（経歴・関係性など）", 3, "例：元保安官。主人公とは旧知の仲")}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-40"
                >
                  💾 保存
                </button>
                <button
                  onClick={() => setForm(null)}
                  className="rounded-lg border border-gray-300 text-gray-600 px-4 py-2 text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setForm({ ...emptyForm })}
              className="text-xs border border-indigo-200 text-indigo-700 rounded-lg px-3 py-1.5"
            >
              ➕ キャラクターを追加
            </button>
          )}
        </div>
      )}
    </section>
  );
}
