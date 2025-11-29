
export type Language = 'en' | 'ru';

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  description: string; // Physical description for AI consistency
  backgroundStory?: string; // Backstory for deeper context
  imageUrl?: string; // Main Portrait
  visualStoryUrl?: string; // The Single Sheet Storyboard (Multi-panel image)
  notes: string;
}

export interface Session {
  id: string;
  date: string;
  title: string;
  rawNotes: string; // What the user typed/dictated
  story: string; // AI enhanced narrative
  translations?: {
    en?: string;
    ru?: string;
  };
  imageUrl?: string;
  charactersInvolved: string[]; // IDs of characters present
}

export interface CampaignSettings {
  imageStyle?: string; // e.g., "Pixel Art", "Dark Fantasy Oil Painting"
  aiInstructions?: string; // e.g., "No technology, spooky atmosphere"
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  settings?: CampaignSettings;
}

export enum Tab {
  TIMELINE = 'TIMELINE',
  CHARACTERS = 'CHARACTERS'
}

export enum GeminiModel {
  TEXT = 'gemini-2.5-flash',
  IMAGE = 'gemini-2.5-flash-image', // Nano Banana
}
