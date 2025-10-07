/*
  Warnings:

  - A unique constraint covering the columns `[itemId]` on the table `Price` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Price_itemId_key" ON "public"."Price"("itemId");
