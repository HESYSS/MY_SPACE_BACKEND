-- DropForeignKey
ALTER TABLE "public"."Characteristic" DROP CONSTRAINT "Characteristic_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Contact" DROP CONSTRAINT "Contact_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Image" DROP CONSTRAINT "Image_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Location" DROP CONSTRAINT "Location_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Metro" DROP CONSTRAINT "Metro_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Price" DROP CONSTRAINT "Price_itemId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Price" ADD CONSTRAINT "Price_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Metro" ADD CONSTRAINT "Metro_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Characteristic" ADD CONSTRAINT "Characteristic_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Image" ADD CONSTRAINT "Image_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
