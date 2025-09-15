-- CreateEnum
CREATE TYPE "public"."OfferReason" AS ENUM ('BUYING', 'SELLING');

-- CreateEnum
CREATE TYPE "public"."OfferPropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND');

-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('PENDING', 'PROCESSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" SERIAL NOT NULL,
    "clientName" TEXT NOT NULL,
    "reason" "public"."OfferReason" NOT NULL,
    "propertyType" "public"."OfferPropertyType" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);
