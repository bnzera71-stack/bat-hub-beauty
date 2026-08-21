ALTER TABLE "Appointment" ADD COLUMN "reminderEndpoint" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "reminderP256dh" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "reminderAuth" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
CREATE INDEX "Appointment_startAt_reminderSentAt_idx" ON "Appointment"("startAt", "reminderSentAt");
