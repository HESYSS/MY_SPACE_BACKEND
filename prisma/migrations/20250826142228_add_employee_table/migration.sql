-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "experienceYears" INTEGER,
    "profile" TEXT,
    "aboutMe" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
