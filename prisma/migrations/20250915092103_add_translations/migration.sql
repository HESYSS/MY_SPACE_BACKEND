-- AlterTable
ALTER TABLE "public"."Characteristic" ADD COLUMN     "keyEn" TEXT,
ADD COLUMN     "valueEn" TEXT;

-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "categoryEn" TEXT,
ADD COLUMN     "dealEn" TEXT,
ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "newbuildingNameEn" TEXT,
ADD COLUMN     "titleEn" TEXT,
ADD COLUMN     "typeEn" TEXT;

-- AlterTable
ALTER TABLE "public"."Location" ADD COLUMN     "boroughEn" TEXT,
ADD COLUMN     "cityEn" TEXT,
ADD COLUMN     "countryEn" TEXT,
ADD COLUMN     "countyEn" TEXT,
ADD COLUMN     "districtEn" TEXT,
ADD COLUMN     "regionEn" TEXT,
ADD COLUMN     "streetEn" TEXT,
ADD COLUMN     "streetTypeEn" TEXT;

-- AlterTable
ALTER TABLE "public"."Metro" ADD COLUMN     "nameEn" TEXT;
