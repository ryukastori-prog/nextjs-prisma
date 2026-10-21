import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { getUser } from "../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    const episodeId = String(req.body?.episodeId ?? "");
    const note = String(req.body?.note ?? "").trim() || "更新";
    const text = String(req.body?.text ?? "");
    if (!episodeId) {
      return res.status(400).json({ error: "episodeIdが必要です" });
    }

    const episode = await prisma.episode.findFirst({
      where: { id: episodeId, userId: user.id },
    });
    if (!episode) return res.status(404).json({ error: "見つかりません" });

    const last = await prisma.version.findFirst({
      where: { episodeId },
      orderBy: { number: "desc" },
    });
    const version = await prisma.version.create({
      data: { episodeId, number: (last?.number ?? 0) + 1, note, text },
    });
    return res.status(201).json(version);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
