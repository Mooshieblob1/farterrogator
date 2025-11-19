---
description: Hybrid Image Tagging Web Interface
---

Role: Frontend Developer / AI Assistant Context: You are working on an existing React (TypeScript) application. The UI is fully set up. Your task is to implement the logic to fetch, combine, and display image tags from two separate AI sources.

1. API Sources
You will be querying two distinct services for every image uploaded or selected:

A. LocalTagger (Booru-Style Tags)
Service: Custom FastAPI Microservice (already deployed).
Endpoint: POST /interrogate/pixai (or GET if using URL).
Payload: FormData with 
file
 field.
Response:
{
  "tags": { "1girl": 0.98, "blue_hair": 0.85, ... },
  "tag_string": "1girl, blue_hair, ..."
}
Goal: Extract high-confidence tags (e.g., > 0.5 confidence).
B. Ollama (Natural Language Tags)
Model: qwen-vl-chat (or similar Qwen 3 VL model).
Goal: Get descriptive, natural language tags and captions.
Prompt Strategy: Ask the model to "Describe this image using a comma-separated list of descriptive tags and a short summary."
2. Integration Logic (The "Hybrid" Model)
Your core task is to combine these two outputs to ensure parity and comprehensive coverage.

Parallel Fetching: Trigger both API calls simultaneously (Promise.all) to minimize user wait time.
Normalization:
Convert all tags to lowercase.
Replace underscores (_) with spaces for display (optional, depends on UI design).
Merging Strategy:
Primary Source: Use LocalTagger (WD14) as the "ground truth" for specific object detection (e.g., "1girl", "cat_ears").
Secondary Source: Use Ollama for abstract concepts, atmosphere, or details WD14 misses (e.g., "melancholic atmosphere", "sunset lighting").
Deduplication: Remove duplicates when merging the lists.
Parity Check:
If Ollama detects a major object (e.g., "dog") that LocalTagger missed (low confidence), include it.
If LocalTagger is very confident (>0.8) about a tag, prioritize it even if Ollama doesn't mention it.
3. Implementation Requirements (React/TS)
State Management:
interface TagState {
  localTags: string[];
  ollamaTags: string[];
  combinedTags: string[];
  isLoading: boolean;
  error: string | null;
}
Display:
Show the final combinedTags list to the user.
(Optional) Visually distinguish sources (e.g., Blue badge for WD14, Green badge for Ollama) if the UI supports it, otherwise blend them seamlessly.
4. Error Handling
If LocalTagger fails: Fallback to Ollama only.
If Ollama fails: Fallback to LocalTagger only.
If Both fail: Show a user-friendly error message.