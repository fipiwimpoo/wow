import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import multer from "multer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/test-gemini", async (req, res) => {
    try {
      const apiKey = req.headers["x-gemini-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "No key" });
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Respond with exactly the word OK",
      });
      res.json({ status: "ok" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API Routes
  app.post(
    "/api/extract-card-data",
    upload.single("image"),
    async (req, res) => {
      console.log(`[server] Received POST /api/extract-card-data`);
      try {
        const apiKey = req.headers["x-gemini-key"] as string;
        if (!apiKey) {
          console.warn(`[server] No API key provided in header`);
          return res.status(401).json({ error: "No Gemini API key provided." });
        }

        if (!req.file) {
          console.warn(`[server] No image file in request`);
          return res.status(400).json({ error: "No image file provided." });
        }

        console.log(
          `[server] Image received: ${req.file.originalname}, Size: ${req.file.size} bytes`,
        );

        const ai = new GoogleGenAI({ apiKey });

        // Build the expected schema
        const schema: Schema = {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Must be 'quest'" },
            title: { type: Type.STRING },
            faction: { type: Type.STRING },
            deckColor: { type: Type.STRING },
            questLevel: { type: Type.INTEGER, nullable: true },
            questArea: { type: Type.STRING },
            primaryRegion: { type: Type.STRING },
            targetCreatures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  creatureType: { type: Type.STRING },
                  creatureColor: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  regionName: { type: Type.STRING },
                  regionId: { type: Type.STRING },
                  isRequiredForCompletion: { type: Type.BOOLEAN },
                },
              },
            },
            independentCreatures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  creatureType: { type: Type.STRING },
                  creatureColor: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  regionName: { type: Type.STRING },
                  regionId: { type: Type.STRING },
                  isRequiredForCompletion: { type: Type.BOOLEAN },
                },
              },
            },
            rewards: {
              type: Type.OBJECT,
              properties: {
                xp: { type: Type.INTEGER, nullable: true },
                gold: { type: Type.INTEGER, nullable: true },
                itemRewards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      itemDeck: { type: Type.STRING },
                      drawCount: { type: Type.INTEGER },
                      keepCount: { type: Type.INTEGER },
                    },
                  },
                },
                specialItems: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
            objectiveText: { type: Type.STRING },
            flavorText: { type: Type.STRING },
            fullRulesText: { type: Type.STRING },
            notes: { type: Type.STRING },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score between 0.0 and 1.0",
            },
          },
        };

        const prompt = `Extract the data from this World of Warcraft board game quest card. 
Extract strictly what is visible. If you are unsure, use null or add notes. 
Follow the JSON schema exactly. Return ONLY valid JSON.`;

        const targetModel =
          (req.headers["x-gemini-model"] as string) || "gemini-2.5-flash";
        console.log(
          `[server] Sending request to Gemini API... Model: ${targetModel}`,
        );
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2,
          },
        });

        console.log("[server] Received response from Gemini API.");
        const text = response.text;
        if (!text) {
          console.error("[server] No response text from Gemini");
          throw new Error("No response text from Gemini");
        }

        console.log("[server] Raw response length:", text.length);

        // Clean markdown backticks if present
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
          const firstNewline = cleanText.indexOf("\n");
          if (firstNewline !== -1) {
            cleanText = cleanText.substring(firstNewline + 1);
          }
          if (cleanText.endsWith("```")) {
            cleanText = cleanText.substring(0, cleanText.length - 3).trim();
          }
        }

        console.log("[server] Parsing JSON...");
        const data = JSON.parse(cleanText);
        console.log("[server] JSON parsed successfully. Sending response.");
        res.json(data);
      } catch (error: any) {
        console.error("[server] Error calling Gemini API:", error);

        let statusCode = 500;
        if (
          error.status === 503 ||
          (error.message && error.message.includes("503"))
        ) {
          statusCode = 503;
        }

        res
          .status(statusCode)
          .json({ error: error.message || "Failed to extract card data" });
      }
    },
  );

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, server: "express", time: new Date().toISOString() });
  });

  app.use(
    "/api",
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error("[server] Global API error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    },
  );

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
