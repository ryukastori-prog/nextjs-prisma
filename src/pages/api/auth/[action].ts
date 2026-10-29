import { randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import {
  appendCookie,
  createSession,
  destroySession,
  getUser,
  readCookie,
} from "../../../lib/auth";

const STATE_COOKIE = "ms_oauth_state";

function origin(req: NextApiRequest) {
  const proto =
    String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0];
  return `${proto}://${req.headers.host}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const action = String(req.query.action);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin(req)}/api/auth/callback`;

  try {
    if (action === "me" && req.method === "GET") {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "ログインしてください" });
      return res.status(200).json({ email: user.email });
    }

    if (action === "logout" && req.method === "POST") {
      await destroySession(req, res);
      return res.status(200).json({ ok: true });
    }

    if (action === "google" && req.method === "GET") {
      if (!clientId || !clientSecret) return res.redirect("/?error=config");
      const state = randomBytes(16).toString("hex");
      appendCookie(
        res,
        `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`
      );
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email",
        state,
        prompt: "select_account",
      });
      return res.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      );
    }

    if (action === "callback" && req.method === "GET") {
      if (!clientId || !clientSecret) return res.redirect("/?error=config");
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");
      const saved = readCookie(req, STATE_COOKIE);
      appendCookie(
        res,
        `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
      );
      if (!code || !state || !saved || state !== saved) {
        return res.redirect("/?error=state");
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });
      if (!tokenRes.ok) return res.redirect("/?error=login");
      const token = await tokenRes.json();

      const infoRes = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${token.access_token}` } }
      );
      if (!infoRes.ok) return res.redirect("/?error=login");
      const info = await infoRes.json();
      if (!info.email || info.email_verified !== true) {
        return res.redirect("/?error=login");
      }

      const email = String(info.email).trim().toLowerCase();
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email },
      });
      await createSession(res, user.id);
      return res.redirect("/");
    }

    return res.status(404).end();
  } catch (e) {
    console.error(e);
    if (action === "google" || action === "callback") {
      return res.redirect("/?error=login");
    }
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
