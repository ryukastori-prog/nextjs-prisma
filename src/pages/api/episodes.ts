import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { getUser } from "../../lib/auth";

const STATUSES = ["執筆中", "確定", "ネーム待ち"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    if (req.method === "GET") {
      const episodes = await prisma.episode.findMany({
        where: { userId: user.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          versions: { orderBy: { number: "desc" } },
          outlineVersions: { orderBy: { number: "desc" }, take: 30 },
        },
      });
      return res.status(200).json(episodes);
    }

    if (req.method === "POST") {
      const title = String(req.body?.title ?? "").trim();
      if (!title) {
        return res.status(400).json({ error: "タイトルを入力してください" });
      }
      const last = await prisma.episode.aggregate({
        where: { userId: user.id },
        _max: { position: true },
      });
      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          title,
          position: (last._max.position ?? -1) + 1,
          versions: { create: { number: 1, note: "初稿", text: "" } },
        },
        include: {
          versions: { orderBy: { number: "desc" } },
          outlineVersions: true,
        },
      });
      return res.status(201).json(episode);
    }

    if (req.method === "PATCH" && Array.isArray(req.body?.order)) {
      const order: string[] = req.body.order.map((v: unknown) => String(v));
      const owned = await prisma.episode.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((e) => e.id));
      if (
        order.length !== ownedIds.size ||
        new Set(order).size !== order.length ||
        !order.every((id) => ownedIds.has(id))
      ) {
        return res.status(400).json({ error: "入力が正しくありません" });
      }
      await prisma.$transaction(
        order.map((id, i) =>
          prisma.episode.update({ where: { id }, data: { position: i } })
        )
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PATCH" && req.body?.outline !== undefined) {
      const id = String(req.body?.id ?? "");
      const o = req.body.outline;
      if (!id || typeof o !== "object" || o === null) {
        return res.status(400).json({ error: "入力が正しくありません" });
      }
      const str = (v: unknown) => String(v ?? "");
      const clean = {
        synopsis: str(o.synopsis),
        ki: str(o.ki),
        sho: str(o.sho),
        ten: str(o.ten),
        ketsu: str(o.ketsu),
        scenes: (Array.isArray(o.scenes) ? o.scenes : [])
          .slice(0, 100)
          .map((s: { title?: unknown; body?: unknown; characterIds?: unknown }) => ({
            title: str(s?.title),
            body: str(s?.body),
            characterIds: (Array.isArray(s?.characterIds) ? s.characterIds : [])
              .map((c: unknown) => str(c).slice(0, 64))
              .slice(0, 30),
          })),
      };
      const outline = JSON.stringify(clean);
      if (outline.length > 60000) {
        return res.status(400).json({ error: "構成が長すぎます" });
      }
      const owned = await prisma.episode.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!owned) return res.status(404).json({ error: "見つかりません" });

      const last = await prisma.outlineVersion.findFirst({
        where: { episodeId: id },
        orderBy: { number: "desc" },
      });
      let version = null;
      if (!last || last.data !== outline) {
        const note =
          String(req.body?.note ?? "").trim().slice(0, 100) ||
          (last ? "更新" : "初版");
        version = await prisma.outlineVersion.create({
          data: {
            episodeId: id,
            number: (last?.number ?? 0) + 1,
            note,
            data: outline,
          },
        });
      }
      await prisma.episode.update({ where: { id }, data: { outline } });
      return res.status(200).json({ id, outline, version });
    }

    if (req.method === "PATCH") {
      const id = String(req.body?.id ?? "");
      const status = String(req.body?.status ?? "");
      if (!id || !STATUSES.includes(status)) {
        return res.status(400).json({ error: "入力が正しくありません" });
      }
      const result = await prisma.episode.updateMany({
        where: { id, userId: user.id },
        data: { status },
      });
      if (result.count === 0) return res.status(404).json({ error: "見つかりません" });
      return res.status(200).json({ id, status });
    }

    if (req.method === "DELETE") {
      const id = String(req.body?.id ?? "");
      if (!id) return res.status(400).json({ error: "入力が正しくありません" });
      const result = await prisma.episode.deleteMany({
        where: { id, userId: user.id },
      });
      if (result.count === 0) return res.status(404).json({ error: "見つかりません" });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
