import { AnyCardData, QuestCardData } from "../models/cardData";
import { getCardImage } from "../utils/db";

export async function extractCardDataFromImage(
  assetId: string,
  apiKey?: string,
  initialModel: string = "gemini-2.5-flash",
  onProgress?: (msg: string) => void,
): Promise<AnyCardData & { confidence?: number }> {
  if (!apiKey) {
    onProgress?.("Modo MOCK activo");
    console.log(`No API key provided. Using mock data for asset ${assetId}...`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      type: "quest",
      cardId: assetId,
      assetId: assetId,
      title: "AI Generated Quest",
      expansion: "base",
      faction: "alliance",
      deckColor: "green",
      questLevel: 1,
      questArea: "Lordaeron",
      primaryRegion: "elwynn_forest",
      spawnRegions: [],
      targetCreatures: [
        {
          creatureType: "Murloc",
          creatureColor: "green",
          count: 2,
          regionName: "Crystal Lake",
          regionId: "crystal_lake",
          isRequiredForCompletion: true,
        },
      ],
      independentCreatures: [
        {
          creatureType: "Wolf",
          creatureColor: "blue",
          count: 1,
          regionName: "Northshire Valley",
          regionId: "northshire_valley",
          isRequiredForCompletion: false,
        },
      ],
      rewards: {
        xp: 1,
        gold: 0,
        itemRewards: [
          {
            itemDeck: "triangle",
            drawCount: 1,
            keepCount: 1,
          },
        ],
        specialItems: [],
      },
      flavorText: "AI identified this text from the image.",
      fullRulesText: "Defeat the Murlocs at Crystal Lake.",
      notes: "Generated with high confidence.",
      objectiveText: "Kill 2 Murlocs.",
      confidence: 1,
    } as QuestCardData & { confidence: number };
  }

  console.log(
    `[aiCardExtractor] Extracting data for asset ${assetId} using AI API...`,
  );
  const blob = await getCardImage(assetId);
  if (!blob) {
    console.error(
      `[aiCardExtractor] Could not find image for asset ${assetId} in IndexedDB.`,
    );
    throw new Error(`Could not find image for asset ${assetId}`);
  }

  console.log(
    `[aiCardExtractor] Found image for ${assetId}. Size: ${blob.size} bytes. Preparing FormData...`,
  );

  const formData = new FormData();
  formData.append("image", blob, `${assetId}.png`);

  const modelsToTry = [initialModel];
  if (initialModel === "gemini-2.5-flash") {
    modelsToTry.push("gemini-2.0-flash", "gemini-1.5-flash");
  }

  let attempt = 1;
  const maxAttempts = 3;
  const backoffDelays = [1500, 3000, 6000];

  for (const currentModel of modelsToTry) {
    for (; attempt <= maxAttempts; attempt++) {
      onProgress?.(
        `Analizando carta... Modelo: ${currentModel} (Intento ${attempt}/${maxAttempts})`,
      );
      console.log(
        `[aiCardExtractor] Sending POST request using model ${currentModel}, attempt ${attempt}`,
      );

      const response = await fetch("/api/extract-card-data", {
        method: "POST",
        headers: {
          "X-Gemini-Key": apiKey,
          "X-Gemini-Model": currentModel,
        },
        body: formData,
      });

      console.log(
        `[aiCardExtractor] Received response with status: ${response.status}`,
      );

      const raw = await response.text();
      console.log(`[aiCardExtractor] Raw response:`, raw.slice(0, 500));

      const lowerRaw = raw.toLowerCase().trim();
      if (lowerRaw.startsWith("<!doctype") || lowerRaw.startsWith("<html")) {
        throw new Error(
          "El endpoint API está devolviendo HTML. El backend Express no está conectado correctamente.",
        );
      }

      if (response.ok) {
        const data = JSON.parse(raw);
        console.log(`[aiCardExtractor] Parsed success response JSON`, data);
        data.cardId = assetId;
        data.assetId = assetId;
        return data;
      }

      let errorData: any = {};
      try {
        errorData = JSON.parse(raw);
      } catch (e) {
        console.error("[aiCardExtractor] Could not parse error JSON:", raw);
      }

      console.error(
        `[aiCardExtractor] HTTP Error ${response.status}:`,
        errorData,
      );

      if (response.status === 503) {
        if (attempt < maxAttempts) {
          const delay = backoffDelays[attempt - 1] || 6000;
          onProgress?.(`Modelo saturado. Reintentando en ${delay / 1000}s...`);
          console.log(
            `[aiCardExtractor] 503 Unavailable. Waiting ${delay}ms before next attempt...`,
          );
          await new Promise((res) => setTimeout(res, delay));
        } else {
          console.log(
            `[aiCardExtractor] Max attempts reached for model ${currentModel}.`,
          );
          attempt = 1; // reset for next model
          break; // move to next model
        }
      } else {
        // Not a 503 error, throw immediately
        throw new Error(
          errorData.error || `Failed to extract data: ${response.statusText}`,
        );
      }
    }
  }

  // If we exhaust all models and attempts
  throw new Error(
    "El modelo está saturado. Probá de nuevo en unos minutos o cambiá el modelo en configuración.",
  );
}
