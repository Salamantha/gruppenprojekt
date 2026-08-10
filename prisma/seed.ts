import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Pool of common German dishes. Each participant is randomly assigned 3 of
// these (see lib/study.ts TOTAL_TRIALS) and freely describes, from memory,
// how to make it — there's no reference recipe to ground against anymore.
const DISH_TITLES = ["Pfannkuchen", "Nudeln mit Tomatensauce", "Rührei", "Kartoffelsalat", "Bratkartoffeln", "Pizza"];

async function main() {
  for (const title of DISH_TITLES) {
    await prisma.recipePrompt.upsert({
      where: { title },
      update: { isActive: true },
      create: { title, isActive: true },
    });
  }

  // Deactivate any leftover prompts from an earlier seed run that aren't in
  // the current pool. Not deleted outright — existing Trial rows may still
  // reference them by promptId.
  await prisma.recipePrompt.updateMany({
    where: { title: { notIn: DISH_TITLES } },
    data: { isActive: false },
  });

  console.log(`Seeded ${DISH_TITLES.length} recipe prompts.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
