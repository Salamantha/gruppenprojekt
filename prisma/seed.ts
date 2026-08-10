import { PrismaClient } from "@prisma/client";
import type { Recipe } from "../types/recipe";

const prisma = new PrismaClient();

interface Seed {
  title: string;
  promptText: string;
  structuredReference: Recipe;
}

const seeds: Seed[] = [
  {
    title: "Pfannkuchen",
    promptText:
      "Rezept für Pfannkuchen. Man braucht 250 Gramm Mehl, 500 Milliliter Milch, 2 Eier und eine Prise Salz. " +
      "Zuerst das Mehl in eine Schüssel geben. Dann die Eier und die Milch dazugeben und alles zu einem glatten Teig verrühren. " +
      "Den Teig 10 Minuten ruhen lassen. Anschließend den Teig portionsweise in einer heißen Pfanne von beiden Seiten goldbraun backen.",
    structuredReference: {
      title: "Pfannkuchen",
      ingredients: [
        { name: "Mehl", quantity: "250", unit: "g" },
        { name: "Milch", quantity: "500", unit: "ml" },
        { name: "Eier", quantity: "2", unit: "" },
        { name: "Salz", quantity: "1", unit: "Prise" },
      ],
      steps: [
        "Das Mehl in eine Schüssel geben.",
        "Die Eier und die Milch dazugeben und alles zu einem glatten Teig verrühren.",
        "Den Teig 10 Minuten ruhen lassen.",
        "Den Teig portionsweise in einer heißen Pfanne von beiden Seiten goldbraun backen.",
      ],
    },
  },
  {
    title: "Rührei",
    promptText:
      "Rezept für Rührei. Man braucht 3 Eier, 50 Milliliter Milch, Salz und Pfeffer sowie 1 Esslöffel Butter. " +
      "Die Eier mit der Milch verquirlen und mit Salz und Pfeffer würzen. Die Butter in einer Pfanne bei mittlerer Hitze schmelzen. " +
      "Die Eiermasse hineingeben und unter Rühren stocken lassen, bis das Rührei cremig ist.",
    structuredReference: {
      title: "Rührei",
      ingredients: [
        { name: "Eier", quantity: "3", unit: "" },
        { name: "Milch", quantity: "50", unit: "ml" },
        { name: "Salz", quantity: "nach Geschmack", unit: "" },
        { name: "Pfeffer", quantity: "nach Geschmack", unit: "" },
        { name: "Butter", quantity: "1", unit: "EL" },
      ],
      steps: [
        "Die Eier mit der Milch verquirlen und mit Salz und Pfeffer würzen.",
        "Die Butter in einer Pfanne bei mittlerer Hitze schmelzen.",
        "Die Eiermasse hineingeben und unter Rühren stocken lassen, bis das Rührei cremig ist.",
      ],
    },
  },
  {
    title: "Tomatensalat",
    promptText:
      "Rezept für Tomatensalat. Man braucht 4 Tomaten, 1 rote Zwiebel, 2 Esslöffel Olivenöl, 1 Esslöffel Essig sowie Salz und Pfeffer. " +
      "Die Tomaten in Scheiben schneiden und die Zwiebel fein würfeln. Beides in eine Schüssel geben. " +
      "Olivenöl und Essig darübergeben und mit Salz und Pfeffer abschmecken. Alles vorsichtig vermengen.",
    structuredReference: {
      title: "Tomatensalat",
      ingredients: [
        { name: "Tomaten", quantity: "4", unit: "" },
        { name: "rote Zwiebel", quantity: "1", unit: "" },
        { name: "Olivenöl", quantity: "2", unit: "EL" },
        { name: "Essig", quantity: "1", unit: "EL" },
        { name: "Salz", quantity: "nach Geschmack", unit: "" },
        { name: "Pfeffer", quantity: "nach Geschmack", unit: "" },
      ],
      steps: [
        "Die Tomaten in Scheiben schneiden und die Zwiebel fein würfeln.",
        "Beides in eine Schüssel geben.",
        "Olivenöl und Essig darübergeben und mit Salz und Pfeffer abschmecken.",
        "Alles vorsichtig vermengen.",
      ],
    },
  },
  {
    title: "Nudeln mit Pesto",
    promptText:
      "Rezept für Nudeln mit Pesto. Man braucht 200 Gramm Nudeln, 3 Esslöffel Pesto und 20 Gramm Parmesan. " +
      "Die Nudeln in kochendem Salzwasser nach Packungsangabe garen. Das Wasser abgießen und die Nudeln zurück in den Topf geben. " +
      "Das Pesto unterrühren und mit geriebenem Parmesan bestreut servieren.",
    structuredReference: {
      title: "Nudeln mit Pesto",
      ingredients: [
        { name: "Nudeln", quantity: "200", unit: "g" },
        { name: "Pesto", quantity: "3", unit: "EL" },
        { name: "Parmesan", quantity: "20", unit: "g" },
      ],
      steps: [
        "Die Nudeln in kochendem Salzwasser nach Packungsangabe garen.",
        "Das Wasser abgießen und die Nudeln zurück in den Topf geben.",
        "Das Pesto unterrühren und mit geriebenem Parmesan bestreut servieren.",
      ],
    },
  },
  {
    title: "Kartoffelsuppe",
    promptText:
      "Rezept für Kartoffelsuppe. Man braucht 600 Gramm Kartoffeln, 1 Zwiebel, 1 Liter Gemüsebrühe und 100 Gramm Sahne. " +
      "Die Kartoffeln schälen und würfeln, die Zwiebel fein hacken. Beides in einem Topf mit der Gemüsebrühe 20 Minuten köcheln lassen. " +
      "Die Suppe pürieren und die Sahne unterrühren. Mit Salz und Pfeffer abschmecken.",
    structuredReference: {
      title: "Kartoffelsuppe",
      ingredients: [
        { name: "Kartoffeln", quantity: "600", unit: "g" },
        { name: "Zwiebel", quantity: "1", unit: "" },
        { name: "Gemüsebrühe", quantity: "1", unit: "l" },
        { name: "Sahne", quantity: "100", unit: "g" },
      ],
      steps: [
        "Die Kartoffeln schälen und würfeln, die Zwiebel fein hacken.",
        "Beides in einem Topf mit der Gemüsebrühe 20 Minuten köcheln lassen.",
        "Die Suppe pürieren und die Sahne unterrühren.",
        "Mit Salz und Pfeffer abschmecken.",
      ],
    },
  },
  {
    title: "Obstsalat",
    promptText:
      "Rezept für Obstsalat. Man braucht 2 Äpfel, 2 Bananen, 200 Gramm Trauben und den Saft einer Zitrone. " +
      "Die Äpfel und Bananen in mundgerechte Stücke schneiden. Die Trauben halbieren. " +
      "Alles Obst in eine Schüssel geben und mit dem Zitronensaft beträufeln, damit es nicht braun wird.",
    structuredReference: {
      title: "Obstsalat",
      ingredients: [
        { name: "Äpfel", quantity: "2", unit: "" },
        { name: "Bananen", quantity: "2", unit: "" },
        { name: "Trauben", quantity: "200", unit: "g" },
        { name: "Zitrone", quantity: "1", unit: "" },
      ],
      steps: [
        "Die Äpfel und Bananen in mundgerechte Stücke schneiden.",
        "Die Trauben halbieren.",
        "Alles Obst in eine Schüssel geben und mit dem Zitronensaft beträufeln, damit es nicht braun wird.",
      ],
    },
  },
  {
    title: "Toast Hawaii",
    promptText:
      "Rezept für Toast Hawaii. Man braucht 4 Scheiben Toastbrot, 4 Scheiben Kochschinken, 4 Scheiben Ananas und 100 Gramm Käse. " +
      "Das Toastbrot mit Schinken, Ananas und Käse belegen. Auf einem Backblech bei 200 Grad etwa 10 Minuten überbacken, bis der Käse geschmolzen ist.",
    structuredReference: {
      title: "Toast Hawaii",
      ingredients: [
        { name: "Toastbrot", quantity: "4", unit: "Scheiben" },
        { name: "Kochschinken", quantity: "4", unit: "Scheiben" },
        { name: "Ananas", quantity: "4", unit: "Scheiben" },
        { name: "Käse", quantity: "100", unit: "g" },
      ],
      steps: [
        "Das Toastbrot mit Schinken, Ananas und Käse belegen.",
        "Auf einem Backblech bei 200 Grad etwa 10 Minuten überbacken, bis der Käse geschmolzen ist.",
      ],
    },
  },
  {
    title: "Haferbrei",
    promptText:
      "Rezept für Haferbrei. Man braucht 50 Gramm Haferflocken, 300 Milliliter Milch und 1 Teelöffel Honig. " +
      "Die Haferflocken mit der Milch in einem Topf verrühren und bei mittlerer Hitze unter Rühren 5 Minuten köcheln lassen, bis der Brei sämig ist. " +
      "Zum Schluss den Honig unterrühren.",
    structuredReference: {
      title: "Haferbrei",
      ingredients: [
        { name: "Haferflocken", quantity: "50", unit: "g" },
        { name: "Milch", quantity: "300", unit: "ml" },
        { name: "Honig", quantity: "1", unit: "TL" },
      ],
      steps: [
        "Die Haferflocken mit der Milch in einem Topf verrühren.",
        "Bei mittlerer Hitze unter Rühren 5 Minuten köcheln lassen, bis der Brei sämig ist.",
        "Zum Schluss den Honig unterrühren.",
      ],
    },
  },
];

async function main() {
  for (const seed of seeds) {
    await prisma.recipePrompt.upsert({
      where: { title: seed.title },
      update: {
        promptText: seed.promptText,
        structuredReference: seed.structuredReference,
        isActive: true,
      },
      create: {
        title: seed.title,
        promptText: seed.promptText,
        structuredReference: seed.structuredReference,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${seeds.length} recipe prompts.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
