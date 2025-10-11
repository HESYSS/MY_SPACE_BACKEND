/*
  Warnings:

  - A unique constraint covering the columns `[itemId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contact_itemId_key" ON "public"."Contact"("itemId");
