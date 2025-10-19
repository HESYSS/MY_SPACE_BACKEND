/*
  Warnings:

  - You are about to drop the column `isSupervisor` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Employee" DROP COLUMN "isSupervisor",
ADD COLUMN     "isSUPERVISOR" BOOLEAN NOT NULL DEFAULT false;
