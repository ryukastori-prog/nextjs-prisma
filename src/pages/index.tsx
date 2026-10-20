import { useState } from "react";

type Version = {
  id: number;
  label: string;
  date: string;
  note: string;
  text: string;
};

type Episode = {
  id: number;
  title: string;
  status: "執筆中" | "確定" | "ネーム待ち";
  versions: Version[];
};

const episodes: Episode[] = [
  {
    id: 1,
    title: "第1話 トリオ誕生",
    status: "確定",
    versions: [
      {
        id: 3,
        label: "v3",
        date: "2026-10-18",
        note: "ラストのセリフを変更",
        text: "三人は砂漠の酒場で出会う。\nラストは笑って終わる。",
      },
      {
        id: 2,
        label: "v2",
        date: "2026-10-12",
        note: "導入を短縮",
        text: "三人は砂漠の酒場で出会う。\nラストは静かに終わる。",
      },
      {
        id: 1,
        label: "v1",
        date: "2026-10-05",
        note: "初稿",
        text: "三人は出会う。\n長い導入のあと、静かに終わる。",
      },
    ],
  },
  {
    id: 2,
    title: "第2話 砂漠の追跡",
    status: "執筆中",
    versions: [
      {
        id: 1,
        label: "v1",
        date: "2026-10-19",
        note: "プロット作成",
        text: "追手に追われ、三人は岩場へ逃げ込む。",
      },
    ],
  },
  {
    id: 3,
    title: "第3話 決闘",
    status: "ネーム待ち",
    versions: [
      {
        id: 1,
        label: "v1",
        date: "2026-10-20",
        note: "アイデアメモ",
        text: "決闘の前夜、三人は作戦を練る。",
      },
    ],
  },
];

const statusStyle: Record<Episode["status"], string> = {
  執筆中: "bg-yellow-100 text-yellow-800",
  確定: "bg-green-100 text-green-800",
  ネーム待ち: "bg-blue-100 text-blue-800",
};

export default function Home() {
  const [episodeId, setEpisodeId] = useState(1);
  const [versionIndex, setVersionIndex] = useState(0);

  const episode = episodes.find((e) => e.id === episodeId)!;
  const current = episode.versions[versionIndex];
  const previous = episode.versions[versionIndex + 1];

  const selectEpisode = (id: number) => {
    setEpisodeId(id);
    setVersionIndex(0);
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-indigo-600 text-white px-4 py-4 shadow">
        <h1 className="text-xl font-bold">📚 MangaSync</h1>
        <p className="text-xs text-indigo-100">漫画原作バージョン管理ツール</p>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">📖 エピソード</h2>
          <div className="space-y-2">
            {episodes.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEpisode(e.id)}
                className={`w-full text-left rounded-xl border p-3 flex items-center justify-between ${
                  e.id === episodeId
                    ? "border-indigo-500 bg-white shadow"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span className="font-medium">{e.title}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${statusStyle[e.status]}`}
                >
                  {e.status}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">🕒 バージョン履歴</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {episode.versions.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setVersionIndex(i)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm border ${
                  i === versionIndex
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {v.label}
                <span className="block text-[10px] opacity-80">{v.date}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">✍️ {current.label} の内容</h3>
            <span className="text-xs text-gray-500">📝 {current.note}</span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-sm">
            {current.text}
          </p>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold mb-2">🔍 前バージョンとの比較</h3>
          {previous ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xs font-bold text-red-700 mb-1">
                  ⬅️ {previous.label}
                </p>
                <p className="whitespace-pre-wrap">{previous.text}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs font-bold text-green-700 mb-1">
                  ➡️ {current.label}
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

        <p className="text-center text-xs text-gray-400 pt-2">
          🚧 現在はデモデータです。次のステップでPrisma連携します。
        </p>
      </div>
    </main>
  );
}
