/*
  Warnings:

  - The `images` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `specifications` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "specifications",
ADD COLUMN     "specifications" JSONB NOT NULL,
DROP COLUMN "images",
ADD COLUMN     "images" TEXT[];
