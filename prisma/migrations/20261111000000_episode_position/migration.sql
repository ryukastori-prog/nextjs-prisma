-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- 既存データは作成順で並べる
UPDATE "Episode" e
SET "position" = t.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") - 1 AS rn
  FROM "Episode"
) t
WHERE e.id = t.id;
