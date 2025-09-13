/*
  Warnings:

  - You are about to drop the column `extraValue` on the `Characteristic` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `Characteristic` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Characteristic" DROP COLUMN "extraValue",
DROP COLUMN "label",
ALTER COLUMN "value" SET DATA TYPE TEXT;
