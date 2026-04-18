-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_barcode_key" ON "FoodItem"("barcode");
