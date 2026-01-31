import { VoiceName, VoiceOption } from './types';

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: VoiceName.Puck, description: 'Soft and even-toned', gender: 'Male' },
  { name: VoiceName.Charon, description: 'Deep and resonant', gender: 'Male' },
  { name: VoiceName.Kore, description: 'Calm and soothing', gender: 'Female' },
  { name: VoiceName.Fenrir, description: 'Energetic and bold', gender: 'Male' },
  { name: VoiceName.Zephyr, description: 'Gentle and airy', gender: 'Female' },
];

export const DEFAULT_TEXT = "The Gemini API gives you access to Google's latest generative AI models. This is a demonstration of the text-to-speech capabilities.";
