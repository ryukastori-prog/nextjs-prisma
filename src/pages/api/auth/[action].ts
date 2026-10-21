import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import {
  createSession,
  destroySession,
  getUser,
  hashPassword,
  verifyPassword,
} from "../../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const action = String(req.query.action);
  try {
    if (action === "me" && req.method === "GET") {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "ログインしてください" });
      return res.status(200).json({ email: user.email });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).end();
    }

    if (action === "logout") {
      await destroySession(req, res);
      return res.status(200).json({ ok: true });
    }

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (action === "signup") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "メールアドレスが正しくありません" });
      }
      if (password.length < 8 || password.length > 200) {
        return res
          .status(400)
          .json({ error: "パスワードは8文字以上にしてください" });
      }
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return res
          .status(409)
          .json({ error: "このメールアドレスは登録済みです" });
      }
      const user = await prisma.user.create({
        data: { email, passwordHash: hashPassword(password) },
      });
      await createSession(res, user.id);
      return res.status(201).json({ email: user.email });
    }

    if (action === "login") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res
          .status(401)
          .json({ error: "メールアドレスまたはパスワードが違います" });
      }
      await createSession(res, user.id);
      return res.status(200).json({ email: user.email });
    }

    return res.status(404).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
