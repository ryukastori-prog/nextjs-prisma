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
        orderBy: { createdAt: "asc" },
        include: { versions: { orderBy: { number: "desc" } } },
      });
      return res.status(200).json(episodes);
    }

    if (req.method === "POST") {
      const title = String(req.body?.title ?? "").trim();
      if (!title) {
        return res.status(400).json({ error: "タイトルを入力してください" });
      }
      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          title,
          versions: { create: { number: 1, note: "初稿", text: "" } },
        },
        include: { versions: { orderBy: { number: "desc" } } },
      });
      return res.status(201).json(episode);
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
