import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { getUser } from "../../lib/auth";

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const cleanRelations = (raw: unknown) =>
  JSON.stringify(
    (Array.isArray(raw) ? raw : [])
      .slice(0, 30)
      .map((r: { targetId?: unknown; label?: unknown }) => ({
        targetId: text(r?.targetId, 64),
        label: text(r?.label, 100),
      }))
      .filter((r: { targetId: string }) => r.targetId)
  );

const parseJson = (raw: unknown): unknown => {
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
};

const clean = (body: { [key: string]: unknown } | undefined) => ({
  name: text(body?.name, 100),
  role: text(body?.role, 100),
  personality: text(body?.personality, 5000),
  appearance: text(body?.appearance, 5000),
  memo: text(body?.memo, 5000),
  relations: cleanRelations(parseJson(body?.relations)),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "ログインしてください" });

    if (req.method === "GET") {
      const characters = await prisma.character.findMany({
        where: { userId: user.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      return res.status(200).json(characters);
    }

    if (req.method === "POST") {
      const data = clean(req.body);
      if (!data.name) {
        return res.status(400).json({ error: "名前を入力してください" });
      }
      const count = await prisma.character.count({ where: { userId: user.id } });
      if (count >= 200) {
        return res.status(400).json({ error: "登録できるキャラクターは200人までです" });
      }
      const last = await prisma.character.aggregate({
        where: { userId: user.id },
        _max: { position: true },
      });
      const character = await prisma.character.create({
        data: {
          userId: user.id,
          name: data.name,
          role: data.role,
          personality: data.personality,
          appearance: data.appearance,
          memo: data.memo,
          relations: data.relations,
          position: (last._max.position ?? -1) + 1,
        },
      });
      return res.status(201).json(character);
    }

    if (req.method === "PATCH" && Array.isArray(req.body?.order)) {
      const order: string[] = req.body.order.map((v: unknown) => String(v));
      const owned = await prisma.character.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((c) => c.id));
      if (
        order.length !== ownedIds.size ||
        new Set(order).size !== order.length ||
        !order.every((id) => ownedIds.has(id))
      ) {
        return res.status(400).json({ error: "入力が正しくありません" });
      }
      await prisma.$transaction(
        order.map((id, i) =>
          prisma.character.update({ where: { id }, data: { position: i } })
        )
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PATCH") {
      const id = String(req.body?.id ?? "");
      const data = clean(req.body);
      if (!id || !data.name) {
        return res.status(400).json({ error: "入力が正しくありません" });
      }
      const result = await prisma.character.updateMany({
        where: { id, userId: user.id },
        data,
      });
      if (result.count === 0) return res.status(404).json({ error: "見つかりません" });
      const character = await prisma.character.findUnique({ where: { id } });
      return res.status(200).json(character);
    }

    if (req.method === "DELETE") {
      const id = String(req.body?.id ?? "");
      if (!id) return res.status(400).json({ error: "入力が正しくありません" });
      const result = await prisma.character.deleteMany({
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
