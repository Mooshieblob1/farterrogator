
import { GoogleGenAI, Type } from "@google/genai";
import { Tag, BackendConfig, TagCategory, InterrogationResult } from "../types";

// --- GEMINI IMPLEMENTATION ---
const getGeminiClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please enter it in the configuration panel.");
  }
  return new GoogleGenAI({ apiKey });
};

const generateTagsGemini = async (base64Image: string, mimeType: string, config: BackendConfig): Promise<InterrogationResult> => {
  const ai = getGeminiClient(config.geminiApiKey);

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      tags: {
        type: Type.ARRAY,
        description: "A list of strict Danbooru-wiki tags describing the image.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            score: { type: Type.NUMBER },
            category: {
              type: Type.STRING,
              enum: ['general', 'character', 'style', 'technical', 'rating']
            }
          },
          required: ["name", "score", "category"],
        },
      },
    },
    required: ["tags"],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: base64Image } },
        { text: getInterrogationPrompt() },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: "You are an expert Danbooru tagger.",
    },
  });

  if (!response.text) return { tags: [] };
  try {
    const data = JSON.parse(response.text);
    // Gemini generates tags first, caption is separate
    return { tags: data.tags || [] };
  } catch (e) {
    console.error("JSON Parse error in Gemini response", e);
    return { tags: [] };
  }
};

// --- LOCAL HYBRID IMPLEMENTATION ---
// Orchestrates: Local Tagger -> Ollama (Clean/Categorize + Caption)
// --- LOCAL HYBRID IMPLEMENTATION ---

export const fetchLocalTags = async (base64Image: string, config: BackendConfig): Promise<Tag[]> => {
  if (!config.taggerEndpoint || config.taggerEndpoint.trim() === '') {
    throw new Error("Local Tagger endpoint is invalid or missing.");
  }

  // Convert base64 to blob for FormData
  const byteCharacters = atob(base64Image);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' }); // Type doesn't strictly matter for the backend usually, but good practice

  const formData = new FormData();
  formData.append('file', blob, 'image.png');

  try {
    const response = await fetch(`${config.taggerEndpoint}?threshold=0.35`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Local Tagger Error: ${response.statusText}`);
    }

    const data = await response.json();
    // Expected format: { tags: { "1girl": 0.99, ... }, tag_string: "..." }

    const tags: Tag[] = [];
    if (data.tags && typeof data.tags === 'object') {
      Object.entries(data.tags).forEach(([name, score]) => {
        tags.push({
          name,
          score: Number(score),
          category: 'general' // Default category, as raw tagger might not provide it
        });
      });
    }

    // Sort by score descending
    return tags.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("Fetch Local Tags Error:", error);
    throw error;
  }
};

export const fetchOllamaModels = async (endpoint: string): Promise<string[]> => {
  if (!endpoint || endpoint.trim() === '') {
    return [];
  }

  try {
    const response = await fetch(`${endpoint}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const data = await response.json();
    // Ollama returns { models: [{ name: "qwen:vl", ... }] }
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error("Fetch Ollama Models Error:", error);
    return [];
  }
};

export const fetchOllamaDescription = async (base64Image: string, config: BackendConfig): Promise<string> => {
  if (!config.ollamaEndpoint || config.ollamaEndpoint.trim() === '') {
    throw new Error("Ollama endpoint is invalid or missing.");
  }

  try {
    const response = await fetch(`${config.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: "Describe this image in detail. Then, list 5 key themes.",
        images: [base64Image],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Fetch Ollama Description Error:", error);
    throw error;
  }
};

// Deprecated monolithic function, keeping for backward compatibility if needed, 
// but the UI should now call fetchLocalTags and fetchOllamaDescription in parallel.
const generateTagsLocalHybrid = async (base64Image: string, config: BackendConfig): Promise<InterrogationResult> => {
  // This is now a wrapper for parallel execution
  const [tagsResult, descriptionResult] = await Promise.allSettled([
    fetchLocalTags(base64Image, config),
    fetchOllamaDescription(base64Image, config)
  ]);

  const tags = tagsResult.status === 'fulfilled' ? tagsResult.value : [];
  const description = descriptionResult.status === 'fulfilled' ? descriptionResult.value : undefined;

  if (tagsResult.status === 'rejected' && descriptionResult.status === 'rejected') {
    throw new Error("Both services failed.");
  }

  return {
    tags,
    naturalDescription: description
  };
};

// --- SHARED UTILITIES ---

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

function getInterrogationPrompt() {
  return `
    Analyze this image for Stable Diffusion tagging using strict Danbooru standards.
    
    CRITICAL RULES:
    1. **REAL TAGS ONLY**: Use ONLY tags that exist in the Danbooru/Gelbooru wiki. 
    2. **Format**: Lowercase, underscores for spaces.
    3. **Categorize**: 'character', 'style', 'technical', 'rating', 'general'.
    
    DEEP CHARACTER SCAN:
    - Hair: Color, Length, Style.
    - Eyes: Color, Shape, Pupils.
    - Features: ears, horns, wings.
    - Body: clothing, legwear, pose.

    MANDATORY TAGS:
    - **Rating**: One of ['rating:general', 'rating:safe', 'rating:sensitive', 'rating:questionable', 'rating:explicit'].
    - **Count**: 1girl, 1boy, etc.
  `;
}

// --- MAIN EXPORTED FUNCTIONS ---

export const generateTags = async (
  base64Image: string,
  mimeType: string,
  config: BackendConfig
): Promise<InterrogationResult> => {
  switch (config.type) {
    case 'local_hybrid':
      return generateTagsLocalHybrid(base64Image, config);
    case 'gemini':
    default:
      return generateTagsGemini(base64Image, mimeType, config);
  }
};

export const generateCaption = async (
  base64Image: string,
  mimeType: string,
  config: BackendConfig
): Promise<string> => {

  if (config.type === 'local_hybrid') {
    if (!config.ollamaEndpoint || config.ollamaEndpoint.trim() === '') {
      throw new Error("Ollama endpoint is missing.");
    }
    // If calling separately for some reason, simple Ollama call
    const response = await fetch(`${config.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: "Describe this image in detail for an image generation prompt.",
        images: [base64Image],
        stream: false
      })
    });
    const data = await response.json();
    return data.response;
  }

  // Gemini Implementation
  const ai = getGeminiClient(config.geminiApiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: base64Image } },
        { text: "Generate a detailed, natural language description of this image suitable for use as a prompt for an image generation model (like Stable Diffusion)." },
      ],
    },
  });
  return response.text || "";
};
