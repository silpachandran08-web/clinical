import { prisma } from "../db/client";
import { generateSlotsForDoctor } from "./slotGenerator";

async function main() {
  const doctors = await prisma.doctor.findMany({ where: { active: true } });
  for (const doctor of doctors) {
    const count = await generateSlotsForDoctor(doctor.id);
    console.log(`Generated ${count} new slots for ${doctor.name}`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
