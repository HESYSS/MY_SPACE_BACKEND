/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "public"."Item"("slug");
