/*
  Warnings:

  - Made the column `priceUsd` on table `Price` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Price" ALTER COLUMN "priceUsd" SET NOT NULL;
