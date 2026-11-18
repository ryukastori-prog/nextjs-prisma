import { useRef, useState } from "react";

type Node = {
  id: string;
  name: string;
  role: string;
  relations: string;
  layoutX?: number | null;
  layoutY?: number | null;
  avatar?: string;
};

export type EdgeRef = { from: string; idx: number };

const COLORS: Record<string, string> = {
  主人公: "#6366f1",
  ヒロイン: "#ec4899",
  ライバル: "#f97316",
  敵役: "#ef4444",
  仲間: "#22c55e",
};

const W = 400;
const H = 390;

const parseRel = (raw: string): { targetId: string; label: string }[] => {
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a)
      ? a.map((r: { targetId?: unknown; label?: unknown }) => ({
          targetId: String(r?.targetId ?? ""),
          label: String(r?.label ?? ""),
        }))
      : [];
  } catch {
    return [];
  }
};

export default function CharacterGraph({
  characters,
  onSelect,
  showAll,
  selectedId,
  secondId,
  onEdgeSelect,
  selectedEdge,
  draggable,
  onMove,
}: {
  characters: Node[];
  onSelect?: (id: string) => void;
  showAll?: boolean;
  selectedId?: string;
  secondId?: string;
  onEdgeSelect?: (from: string, idx: number) => void;
  selectedEdge?: EdgeRef | null;
  draggable?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  const byId = new Map(characters.map((c) => [c.id, c]));
  const edges: { from: string; to: string; label: string; idx: number }[] = [];
  characters.forEach((c) =>
    parseRel(c.relations ?? "[]").forEach((r, idx) => {
      if (byId.has(r.targetId) && r.targetId !== c.id) {
        edges.push({ from: c.id, to: r.targetId, label: r.label, idx });
      }
    })
  );
  const ids = characters
    .map((c) => c.id)
    .filter((id) => showAll || edges.some((e) => e.from === id || e.to === id));

  if (ids.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        まだ関係がありません。キャラクターの編集で「🔗 関係性」を追加すると、ここに図が表示されます
      </p>
    );
  }

  const n = ids.length;
  const R = n === 1 ? 0 : n === 2 ? 100 : 135;
  const pos = new Map<string, { x: number; y: number }>();
  ids.forEach((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const c = byId.get(id)!;
    const saved =
      typeof c.layoutX === "number" && typeof c.layoutY === "number"
        ? { x: c.layoutX, y: c.layoutY }
        : null;
    pos.set(id, saved ?? { x: 200 + R * Math.cos(a), y: 190 + R * Math.sin(a) });
  });
  if (drag && pos.has(drag.id)) pos.set(drag.id, { x: drag.x, y: drag.y });

  const toSvg = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * W) / rect.width;
    const y = ((e.clientY - rect.top) * H) / rect.height;
    return {
      x: Math.min(W - 25, Math.max(25, x)),
      y: Math.min(H - 35, Math.max(25, y)),
    };
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      style={{ touchAction: draggable ? "none" : "auto" }}
      role="img"
      aria-label="人物相関図"
      onPointerMove={(e) => {
        if (drag) setDrag({ id: drag.id, ...toSvg(e) });
      }}
      onPointerUp={() => {
        if (drag) {
          onMove?.(drag.id, drag.x, drag.y);
          setDrag(null);
        }
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <marker
          id="rel-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0L10 5L0 10z" fill="#6b7280" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const p1 = pos.get(e.from);
        const p2 = pos.get(e.to);
        if (!p1 || !p2) return null;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const s = { x: p1.x + ux * 24, y: p1.y + uy * 24 };
        const t = { x: p2.x - ux * 28, y: p2.y - uy * 28 };
        const c = {
          x: (p1.x + p2.x) / 2 - uy * 22,
          y: (p1.y + p2.y) / 2 + ux * 22,
        };
        const lx = 0.25 * s.x + 0.5 * c.x + 0.25 * t.x;
        const ly = 0.25 * s.y + 0.5 * c.y + 0.25 * t.y;
        const d = `M${s.x},${s.y} Q${c.x},${c.y} ${t.x},${t.y}`;
        const sel = selectedEdge?.from === e.from && selectedEdge?.idx === e.idx;
        return (
          <g
            key={i}
            onClick={() => onEdgeSelect?.(e.from, e.idx)}
            style={{ cursor: onEdgeSelect ? "pointer" : "default" }}
          >
            <path
              d={d}
              fill="none"
              stroke={sel ? "#4f46e5" : "#9ca3af"}
              strokeWidth={sel ? 2.5 : 1.5}
              markerEnd="url(#rel-arrow)"
            />
            {onEdgeSelect && (
              <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
            )}
            {e.label && (
              <text
                x={lx}
                y={ly}
                fontSize={10}
                textAnchor="middle"
                fill={sel ? "#4338ca" : "#374151"}
                stroke="#fff"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {ids.map((id) => {
        const c = byId.get(id)!;
        const p = pos.get(id)!;
        return (
          <g
            key={id}
            onClick={() => {
              if (!draggable) onSelect?.(id);
            }}
            onPointerDown={(e) => {
              if (!draggable) return;
              e.preventDefault();
              svgRef.current?.setPointerCapture(e.pointerId);
              setDrag({ id, ...toSvg(e) });
            }}
            style={{ cursor: draggable ? "grab" : onSelect ? "pointer" : "default" }}
          >
            {(id === selectedId || id === secondId) && (
              <circle
                cx={p.x}
                cy={p.y}
                r={27}
                fill="none"
                stroke={id === selectedId ? "#4f46e5" : "#f59e0b"}
                strokeWidth={3}
              />
            )}
            <circle cx={p.x} cy={p.y} r={22} fill={COLORS[c.role] ?? "#9ca3af"} />
            {c.avatar ? (
              <>
                <clipPath id={`clip-${id}`}>
                  <circle cx={p.x} cy={p.y} r={19} />
                </clipPath>
                <image
                  href={c.avatar}
                  x={p.x - 19}
                  y={p.y - 19}
                  width={38}
                  height={38}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#clip-${id})`}
                />
              </>
            ) : (
              <text x={p.x} y={p.y + 4} fontSize={11} textAnchor="middle" fill="#fff" fontWeight="bold">
                {Array.from(c.name).slice(0, 3).join("")}
              </text>
            )}
            <text x={p.x} y={p.y + 38} fontSize={11} textAnchor="middle" fill="#111827">
              {Array.from(c.name).slice(0, 8).join("")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
