import { randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "./prisma";

const COOKIE = "ms_session";
const DAYS = 30;

export function appendCookie(res: NextApiResponse, value: string) {
  const prev = res.getHeader("Set-Cookie");
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  res.setHeader("Set-Cookie", [...list, value]);
}

export function readCookie(req: NextApiRequest, name: string) {
  const part = (req.headers.cookie ?? "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="));
  return part ? part.slice(name.length + 1) : null;
}

export async function createSession(res: NextApiResponse, userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400 * 1000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  appendCookie(
    res,
    `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${DAYS * 86400}`
  );
}

export async function getUser(req: NextApiRequest) {
  const id = readCookie(req, COOKIE);
  if (!id) return null;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(req: NextApiRequest, res: NextApiResponse) {
  const id = readCookie(req, COOKIE);
  if (id) await prisma.session.deleteMany({ where: { id } });
  appendCookie(
    res,
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
  );
}
