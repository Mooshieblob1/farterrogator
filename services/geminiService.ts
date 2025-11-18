
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
const generateTagsLocalHybrid = async (base64Image: string, config: BackendConfig): Promise<InterrogationResult> => {
  // Validate endpoints
  if (!config.ollamaEndpoint || config.ollamaEndpoint.trim() === '') {
    throw new Error("Ollama endpoint is invalid or missing.");
  }
  if (!config.taggerEndpoint || config.taggerEndpoint.trim() === '') {
    throw new Error("Local Tagger endpoint is invalid or missing.");
  }

  try {
    // Step 1: Get Raw Tags from Local Tagger (e.g., WD1.4)
    // We assume the local tagger accepts a base64 image and returns a simple list of tags or a map
    let rawTags: string[] = [];
    try {
      const taggerResponse = await fetch(config.taggerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });
      
      if (taggerResponse.ok) {
        const taggerData = await taggerResponse.json();
        // Assume taggerData is { tags: { "1girl": 0.99, "blue_hair": 0.8 ... } } or { tags: ["1girl", ...] }
        if (Array.isArray(taggerData.tags)) {
            rawTags = taggerData.tags;
        } else if (typeof taggerData.tags === 'object') {
            rawTags = Object.keys(taggerData.tags);
        }
      } else {
        console.warn("Local tagger failed, proceeding with Ollama vision-only.");
      }
    } catch (e) {
      console.warn("Could not connect to local tagger, proceeding with Ollama vision-only.", e);
    }

    // Step 2: Send Image + Raw Tags to Ollama for Logic/Formatting/Captioning
    const prompt = `
      Analyze this image.
      ${rawTags.length > 0 ? `I have already run a basic tagger which found these potential tags: ${rawTags.join(', ')}.` : ''}
      
      YOUR TASKS:
      1. Verify the raw tags and add any missing details (hair style, clothes, background).
      2. Categorize all tags strictly (General, Character, Style, Technical, Rating).
      3. Generate a detailed Natural Language prompt describing the image.
      
      Return strictly valid JSON:
      {
        "tags": [{"name": "tag_name", "score": 0.9, "category": "general"}],
        "naturalDescription": "A full sentence description..."
      }
      
      ${getInterrogationPrompt()}
    `;

    const ollamaResponse = await fetch(`${config.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: prompt,
        images: [base64Image], // Ollama expects base64 without header
        stream: false,
        format: "json"
      })
    });

    if (!ollamaResponse.ok) throw new Error(`Ollama Error: ${ollamaResponse.statusText}`);
    
    const data = await ollamaResponse.json();
    const parsed = JSON.parse(data.response);
    
    return {
        tags: parsed.tags || [],
        naturalDescription: parsed.naturalDescription // Seamlessly returned
    };

  } catch (error) {
    console.error("Local Hybrid Error:", error);
    throw new Error("Failed to execute Local Hybrid flow. Check console for details.");
  }
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
