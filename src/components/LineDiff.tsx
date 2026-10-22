type Row = { type: "same" | "add" | "del"; text: string };

function diffLines(before: string, after: string): Row[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  if (n * m > 4_000_000) {
    return [
      ...a.map((text): Row => ({ type: "del", text })),
      ...b.map((text): Row => ({ type: "add", text })),
    ];
  }

  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i] === b[j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }

  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      rows.push({ type: "del", text: a[i] });
      i++;
    } else {
      rows.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ type: "del", text: a[i++] });
  while (j < m) rows.push({ type: "add", text: b[j++] });
  return rows;
}

const rowStyle = {
  same: "text-gray-600",
  add: "bg-green-50 text-green-800",
  del: "bg-red-50 text-red-700 line-through decoration-red-300",
};
const mark = { same: "　", add: "＋", del: "－" };

export default function LineDiff({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const rows = diffLines(before, after);
  const added = rows.filter((r) => r.type === "add").length;
  const removed = rows.filter((r) => r.type === "del").length;

  return (
    <div className="text-sm">
      <p className="text-xs text-gray-500 mb-2">
        {beforeLabel} ➡️ {afterLabel}　
        <span className="text-green-700">＋{added}行</span>　
        <span className="text-red-700">－{removed}行</span>
      </p>
      {added === 0 && removed === 0 ? (
        <p className="text-gray-500">✅ 変更はありません</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {rows.map((r, k) => (
            <div key={k} className={`flex gap-2 px-2 py-0.5 ${rowStyle[r.type]}`}>
              <span className="shrink-0 select-none">{mark[r.type]}</span>
              <span className="whitespace-pre-wrap break-words min-w-0">
                {r.text || " "}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
