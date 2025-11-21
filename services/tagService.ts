import { TagCategory } from '../types';

interface TagData {
    tagId: number;
    name: string;
    category: number;
    count: number;
}

let tagDatabase: Map<string, TagCategory> = new Map();
let isLoaded = false;

const CATEGORY_MAPPING: Record<number, TagCategory> = {
    0: 'general',
    1: 'artist',
    3: 'copyright',
    4: 'character',
    5: 'meta',
    9: 'rating'
};

export const loadTagDatabase = async (): Promise<void> => {
    if (isLoaded) return;

    try {
        const response = await fetch('/danbooru_tags.csv');
        if (!response.ok) {
            throw new Error(`Failed to load tag database: ${response.statusText}`);
        }

        const text = await response.text();
        const lines = text.split('\n');

        // No header in tags.csv
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // CSV format: name,category,count,aliases
            const parts = line.split(',');
            if (parts.length >= 2) {
                const name = parts[0];
                const categoryId = parseInt(parts[1], 10);
                const category = CATEGORY_MAPPING[categoryId] || 'general';

                tagDatabase.set(name, category);
            }
        }

        isLoaded = true;
        console.log(`[TagService] Loaded ${tagDatabase.size} tags.`);
    } catch (error) {
        console.error("[TagService] Error loading tag database:", error);
        // Fallback or retry logic could go here, but for now we just log.
    }
};

export const getCategory = (tagName: string): TagCategory => {
    // 1. Try exact match from CSV
    if (tagDatabase.has(tagName)) {
        return tagDatabase.get(tagName)!;
    }

    // 2. Fallback heuristics for tags not in CSV (or if CSV failed to load)
    if (tagName.startsWith('rating:') || ['general', 'safe', 'questionable', 'explicit', 'sensitive', 'nsfw'].includes(tagName)) {
        return 'rating';
    }
    if (['highres', 'absurdres', '4k', '8k', 'masterpiece', 'best quality', 'comic', 'monochrome', 'greyscale', 'lowres', 'bad quality', 'worst quality'].includes(tagName)) {
        return 'meta';
    }
    if (['1girl', '1boy', '2girls', '2boys', 'multiple girls', 'multiple boys'].includes(tagName)) {
        return 'general'; // Danbooru standard
    }

    return 'general';
};

export const isTagInCategory = (tagName: string, category: TagCategory): boolean => {
    return tagDatabase.get(tagName) === category;
};

export const isValidTag = (tagName: string): boolean => {
    return tagDatabase.has(tagName);
};
