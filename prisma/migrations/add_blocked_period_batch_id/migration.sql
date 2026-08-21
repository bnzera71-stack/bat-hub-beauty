ALTER TABLE "BlockedPeriod" ADD COLUMN "batchId" TEXT;
CREATE INDEX "BlockedPeriod_batchId_idx" ON "BlockedPeriod"("batchId");
