-- Trial vira minutos em vez de dias (seção 35: trial curto e controlado).
ALTER TABLE "AppSettings" RENAME COLUMN "trialDays" TO "trialMinutes";
ALTER TABLE "AppSettings" ALTER COLUMN "trialMinutes" SET DEFAULT 15;
UPDATE "AppSettings" SET "trialMinutes" = 15 WHERE id = 1;
