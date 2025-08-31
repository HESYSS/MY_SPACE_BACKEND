-- CreateTable
CREATE TABLE "public"."Item" (
    "id" SERIAL NOT NULL,
    "crmId" TEXT NOT NULL,
    "status" TEXT,
    "title" TEXT,
    "description" TEXT,
    "deal" TEXT,
    "type" TEXT,
    "isNewBuilding" BOOLEAN,
    "article" TEXT,
    "category" TEXT,
    "newbuildingName" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "borough" TEXT,
    "district" TEXT,
    "street" TEXT,
    "streetType" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Metro" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,

    CONSTRAINT "Metro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Characteristic" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "key" TEXT,
    "value" DOUBLE PRECISION,
    "label" TEXT,
    "extraValue" TEXT,

    CONSTRAINT "Characteristic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Price" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Image" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_crmId_key" ON "public"."Item"("crmId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_itemId_key" ON "public"."Location"("itemId");

-- CreateIndex
CREATE INDEX "Metro_itemId_distance_idx" ON "public"."Metro"("itemId", "distance");

-- CreateIndex
CREATE INDEX "Characteristic_itemId_key_idx" ON "public"."Characteristic"("itemId", "key");

-- CreateIndex
CREATE INDEX "Price_value_idx" ON "public"."Price"("value");

-- CreateIndex
CREATE INDEX "Image_itemId_order_idx" ON "public"."Image"("itemId", "order");

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Metro" ADD CONSTRAINT "Metro_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Characteristic" ADD CONSTRAINT "Characteristic_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Price" ADD CONSTRAINT "Price_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Image" ADD CONSTRAINT "Image_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
