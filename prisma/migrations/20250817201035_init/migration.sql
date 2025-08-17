-- CreateEnum
CREATE TYPE "public"."EndingMode" AS ENUM ('CAPITULOS', 'SIN_FINAL_DEFINIDO', 'FINAL_SORPRESA', 'INFINITA');

-- CreateTable
CREATE TABLE "public"."Story" (
    "id" TEXT NOT NULL,
    "optionsPerDecision" INTEGER NOT NULL,
    "endingMode" "public"."EndingMode" NOT NULL,
    "chaptersCount" INTEGER,
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);
