import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "./prisma";

const COOKIE = "ms_session";
const DAYS = 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(res: NextApiResponse, userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400 * 1000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${DAYS * 86400}`
  );
}

function readToken(req: NextApiRequest) {
  const part = (req.headers.cookie ?? "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="));
  return part ? part.slice(COOKIE.length + 1) : null;
}

export async function getUser(req: NextApiRequest) {
  const id = readToken(req);
  if (!id) return null;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(req: NextApiRequest, res: NextApiResponse) {
  const id = readToken(req);
  if (id) await prisma.session.deleteMany({ where: { id } });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
  );
}
