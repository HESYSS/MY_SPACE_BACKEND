/*
  Warnings:

  - You are about to drop the column `keyEn` on the `Characteristic` table. All the data in the column will be lost.
  - You are about to drop the column `categoryEn` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `dealEn` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `cityEn` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `countryEn` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `regionEn` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `streetTypeEn` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `nameEn` on the `Metro` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Characteristic" DROP COLUMN "keyEn";

-- AlterTable
ALTER TABLE "public"."Item" DROP COLUMN "categoryEn",
DROP COLUMN "dealEn";

-- AlterTable
ALTER TABLE "public"."Location" DROP COLUMN "cityEn",
DROP COLUMN "countryEn",
DROP COLUMN "regionEn",
DROP COLUMN "streetTypeEn";

-- AlterTable
ALTER TABLE "public"."Metro" DROP COLUMN "nameEn";
