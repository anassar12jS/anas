import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure high payload limits for uploading images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini AI Client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // prediction endpoint
  app.post("/api/predict", async (req: express.Request, res: express.Response) => {
    try {
      const { image, imageUrl } = req.body;
      if (!image && !imageUrl) {
        return res.status(400).json({ error: "Missing image or imageUrl payload. Please select an image." });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is not defined. Please add your Gemini API key in the Secrets panel." 
        });
      }

      // Prepare the inlineData part for Gemini
      let imagePart;
      
      if (image) {
        // Extract raw base64 and mime type
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        let mimeType = "image/jpeg";
        let base64Data = image;
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
        imagePart = {
          inlineData: {
            mimeType,
            data: base64Data,
          }
        };
      } else {
        // Fetch imageUrl from the server-side to bypass CORS issues on browser client
        const remoteRes = await fetch(imageUrl);
        if (!remoteRes.ok) {
          throw new Error(`Failed to fetch sample image URL: ${remoteRes.statusText}`);
        }
        const arrayBuffer = await remoteRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = remoteRes.headers.get("content-type") || "image/jpeg";
        imagePart = {
          inlineData: {
            mimeType,
            data: buffer.toString("base64"),
          }
        };
      }

      const prompt = `You are a legendary Geoguessr player and world champion Open Source Intelligence (OSINT) analyst (think RAINBOLT).
Analyze this image to identify the exact country, region/state, nearest city, and estimate its precise geographic latitude and longitude coordinates.

Examine all visible visual hints with extreme attention to detail:
1. Driving Side: Which side of the road are cars driving on? Road markings, driver placement.
2. Utility/Electricity Poles: Polish wooden poles with metal steps, Romanian cement poles with yellow rings, perforated concrete poles (common in Poland, France, Turkey), hexagonal poles (Japan), etc.
3. Road Markings & Quality: Double yellow centerlines (Americas, Israel), single white lines, yellow shoulder lines (South Africa, Botswana, Ireland), asphalt color and texture.
4. Flora, Trees & Soil: Birch trees (Scandinavia, Russia), eucalyptus trees (Australia, some in South Africa, Spain), Araucaria pins (Parana state in Brazil), tall thin cypress (Mediterranean), dry red clay soil (Central/East Africa, Australia, parts of Brazil).
5. License Plates: Long white EU plates, yellow plates (rear in UK, front/rear in Netherlands/Luxembourg, general in Israel/France-old/Colombia-commercial), small square plates (Americas, Japan, South Korea).
6. Language, Scripts & Fonts: Cyrillic alphabet (Russia, Bulgaria, Ukraine, Serbia), Greek alphabet, Latin modifiers (e.g. Polish letters ł, ę, ś, Turkish ş, ı, Czech ř, á, Icelandic ð, þ), Thai/Lao script, Malayalam/Tamil/Hindi, Katakana/Hiragana/Kanji.
7. Bollards & Signposts: Gideline markers (e.g. white bollards with red stripes in Germany, red cap bollards in Poland, plastic rods in New Zealand, striped borders).
8. Architecture & General Vibe: Roof tiles, brick vs wood vs concrete construction, houses on stilts, telephone booth designs.

Perform a step-by-step reasoning deduction inside rainboltReasoning, expressing typical hyper-active, fast, hype-filled, Geoguessr-slang commentary (e.g., 'Nice, we got the Cyrillic text on the local sign, but look at the grass color. It's that typical green-blue shade with yellow accents you only get in northern Kyrgyzstan. And the pole has the triplet bands. We are near Cholpon-Ata, let's go.').

Return your final output in strict conformance with the JSON schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          prompt,
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              country: { type: Type.STRING, description: "Predicted country name" },
              region: { type: Type.STRING, description: "Predicted state, administrative division, province, or region" },
              city: { type: Type.STRING, description: "Nearest estimated city or village name" },
              lat: { type: Type.NUMBER, description: "Estimated latitude coordinate (must be a valid number between -90 and 90)" },
              lng: { type: Type.NUMBER, description: "Estimated longitude coordinate (must be a valid number between -180 and 180)" },
              confidence: { type: Type.INTEGER, description: "Confidence score percentage (0 to 100)" },
              clues: {
                type: Type.ARRAY,
                description: "Key clues identified and their OSINT significance",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING, description: "Clue class, e.g., Driving Side, Utility Pole, Road Markings, Soil, Flora, Language, License Plate, Bollard" },
                    observation: { type: Type.STRING, description: "Literal observation from the picture (e.g. 'Double dashed yellow lines in center of road')" },
                    significance: { type: Type.STRING, description: "Deductive meaning (e.g. 'Highly typical of South African rural highways.')" },
                    confidence: { type: Type.INTEGER, description: "Confidence in this specific clue clue (0 to 100)" },
                  },
                  required: ["category", "observation", "significance", "confidence"],
                },
              },
              rainboltReasoning: { type: Type.STRING, description: "Fast, hyped, legendary Geoguessr player-style stream-of-consciousness commentary." },
            },
            required: ["country", "region", "city", "lat", "lng", "confidence", "clues", "rainboltReasoning"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI model.");
      }

      res.setHeader("Content-Type", "application/json");
      res.send(text.trim());
    } catch (error: any) {
      console.error("OSINT predict backend error:", error);
      res.status(500).json({ error: error.message || "An error occurred while analyzing the image." });
    }
  });

  // Vite development integration or static middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded on port ${PORT}`);
  });
}

startServer();
