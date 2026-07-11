-- DropIndex
DROP INDEX "Appointment_slotId_key";

-- CreateIndex
CREATE INDEX "Appointment_slotId_idx" ON "Appointment"("slotId");

-- A cancelled/no-show appointment keeps its slotId as history, so the plain
-- unique index above was dropped in favor of this partial one: at most one
-- *active* (non-terminal) appointment per slot is still enforced, but a
-- slot can accumulate any number of CANCELLED/NO_SHOW rows without blocking
-- reuse once it's freed.
CREATE UNIQUE INDEX "Appointment_slotId_active_key" ON "Appointment"("slotId") WHERE "status" NOT IN ('CANCELLED', 'NO_SHOW');
