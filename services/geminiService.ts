
import { GoogleGenAI } from "@google/genai";
import { Character, GeminiModel, CampaignSettings, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_STYLE = "Fantasy art style, Dungeons and Dragons aesthetic, oil painting texture";

// Helper to construct a prompt that maintains visual consistency
const buildVisualPrompt = (
  basePrompt: string, 
  characters: Character[], 
  settings?: CampaignSettings, 
  context?: string, 
  extraInstructions?: string
): string => {
  const style = settings?.imageStyle ? settings.imageStyle : DEFAULT_STYLE;
  const globalInstructions = settings?.aiInstructions ? ` GLOBAL RULES: ${settings.aiInstructions}.` : "";

  // We append English style instructions to ensure quality, but the user content remains in its original language
  let prompt = `${style}. ${basePrompt}. `;
  
  if (characters.length > 0) {
    prompt += " The scene features the following characters with these specific appearances: ";
    characters.forEach(c => {
      prompt += `${c.name} (${c.race} ${c.class}): ${c.description}. ${c.backgroundStory ? `Background context: ${c.backgroundStory}.` : ''} `;
    });
  }

  if (context) {
    prompt += ` Context: ${context}`;
  }

  if (extraInstructions) {
    prompt += ` IMPORTANT MODIFICATION INSTRUCTIONS: ${extraInstructions}`;
  }

  if (globalInstructions) {
    prompt += globalInstructions;
  }

  return prompt;
};

// Error handler helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleGeminiError = (error: any, fallbackMessage?: string) => {
    console.error("Gemini API Error:", error);
    // Check for 429 RESOURCE_EXHAUSTED
    if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429 || (error.message && error.message.includes('429'))) {
        console.warn("Quota exceeded. Please try again later.");
        if (fallbackMessage) return fallbackMessage + " (API Quota Exceeded)";
        return undefined;
    }
    return fallbackMessage || undefined;
};

export const generateSessionStory = async (notes: string, settings?: CampaignSettings, language: Language = 'en'): Promise<string> => {
  try {
    const contextInstruction = settings?.aiInstructions 
      ? `Keep the following tone/rules in mind: ${settings.aiInstructions}.` 
      : "Keep it immersive.";
    
    const langInstruction = language === 'ru' 
      ? "IMPORTANT: You MUST write the response purely in Russian." 
      : "IMPORTANT: You MUST write the response in English.";

    const response = await ai.models.generateContent({
      model: GeminiModel.TEXT,
      contents: `You are a master storyteller for a tabletop RPG. 
      Take the following session notes and rewrite them into a compelling, atmospheric narrative paragraph (max 150 words). 
      ${contextInstruction}
      ${langInstruction}
      
      Notes: ${notes}`,
    });
    return response.text || (language === 'ru' ? "Летописи молчат об этом." : "The chronicles are silent on this matter.");
  } catch (error) {
    const fallback = language === 'ru' ? "Писец не смог разобрать события." : "The scribe could not decipher the events.";
    return handleGeminiError(error, fallback) as string;
  }
};

export const translateText = async (text: string, targetLanguage: Language): Promise<string> => {
  try {
    const langName = targetLanguage === 'ru' ? 'Russian' : 'English';
    const response = await ai.models.generateContent({
      model: GeminiModel.TEXT,
      contents: `You are a professional fantasy novel translator. 
      Translate the following RPG narrative text into ${langName}.
      
      Rules:
      1. Maintain the atmospheric, storytelling tone. 
      2. Do not add any meta-text, intro, or outro. 
      3. Just provide the direct translation.
      
      Text to translate: "${text}"`,
    });
    
    const result = response.text?.trim();
    if (!result || result === text) {
        // If the API returns the exact same text or empty, consider it a failure (unless text was super short)
        if (text.length > 10) return text; 
    }
    return result || text;
  } catch (error) {
    console.error("Translation failed:", error);
    // Return original text if translation fails
    return handleGeminiError(error, text) as string;
  }
};

export const generateSessionImage = async (story: string, characters: Character[], settings?: CampaignSettings): Promise<string | undefined> => {
  try {
    const prompt = buildVisualPrompt(`A scene depicting: ${story}`, characters, settings);
    
    const response = await ai.models.generateContent({
      model: GeminiModel.IMAGE,
      contents: {
        parts: [{ text: prompt }]
      }
    });

    // Extract image from response parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    return handleGeminiError(error);
  }
};

export const generateCharacterImage = async (character: Character, settings?: CampaignSettings, additionalInstructions?: string): Promise<string | undefined> => {
  try {
    const backgroundContext = character.backgroundStory ? ` Background history: ${character.backgroundStory}.` : "";
    
    const prompt = buildVisualPrompt(
      `A detailed character portrait of ${character.name}, a ${character.race} ${character.class}. ${character.description}.${backgroundContext}`, 
      [], 
      settings,
      "Focus on the character against a thematic background that reflects their history.",
      additionalInstructions
    );

    const response = await ai.models.generateContent({
      model: GeminiModel.IMAGE,
      contents: {
        parts: [{ text: prompt }]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    return handleGeminiError(error);
  }
};

export const generateBackstoryScenes = async (character: Character, settings?: CampaignSettings): Promise<string | undefined> => {
  try {
    if (!character.backgroundStory) return undefined;

    const style = settings?.imageStyle ? settings.imageStyle : "Graphic novel style, detailed line art with atmospheric coloring";
    const globalInstructions = settings?.aiInstructions ? `GLOBAL RULES: ${settings.aiInstructions}.` : "";

    // Prompt for a single-page storyboard layout
    const prompt = `
      Create a single image that is a storyboard layout or comic book page summarizing this character's origin story.
      The image must contain between 4 to 8 distinct panels arranged artistically on one sheet.
      
      Style: ${style}.
      Format: Vertical or Square Page Layout.
      Constraints: NO text, NO speech bubbles. Pure visual storytelling through sequence.
      ${globalInstructions}
      
      Character: ${character.name}, ${character.race} ${character.class}.
      Appearance: ${character.description}.
      
      Backstory to Visualize: ${character.backgroundStory}
    `;

    const response = await ai.models.generateContent({
      model: GeminiModel.IMAGE,
      contents: {
        parts: [{ text: prompt }]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    return handleGeminiError(error);
  }
};
