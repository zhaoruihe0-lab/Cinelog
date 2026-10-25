import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

const createClient = () => {
  if (!API_KEY) return null;
  return new GoogleGenAI({ apiKey: API_KEY });
};

export interface MovieDetails {
  year: string;
  director: string; // English name preferred
  country: string;
  summary: string;
  chineseTitle: string;
  genres: string[];
}

export const getMovieDetails = async (title: string): Promise<MovieDetails | null> => {
  const ai = createClient();
  if (!ai) {
    console.warn("Gemini API Key is missing.");
    return null;
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Identify the movie "${title}". 
    1. Return its Release Year.
    2. Director's Name (Format: "English Name / Chinese Name" if possible, e.g. "Christopher Nolan / 克里斯托弗·诺兰").
    3. Country.
    4. A short summary in Simplified Chinese.
    5. The official Chinese Title (Simplified).
    6. A list of 1-3 genres (e.g. "Drama", "Sci-Fi", "Action") that best match the movie. MUST BE IN ENGLISH.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            director: { type: Type.STRING },
            country: { type: Type.STRING },
            summary: { type: Type.STRING },
            chineseTitle: { type: Type.STRING },
            genres: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING, description: "Genre name in English" } 
            },
          },
          required: ["year", "director", "country", "summary", "chineseTitle", "genres"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as MovieDetails;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch movie details from Gemini:", error);
    return null;
  }
};