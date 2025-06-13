
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

// IMPORTANT: For frontend applications, API keys should ideally be handled via a backend proxy
// or a secure build-time replacement mechanism. Exposing API keys directly in client-side
// code is a security risk. The prompt specifies using process.env.API_KEY, which
// in a typical Node.js backend context is fine. For frontend, tools like Vite use
// `import.meta.env.VITE_API_KEY` after configuring .env files.
// We are using process.env.API_KEY as specified, assuming an environment where this is made available.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    "Gemini API Key not found. Please set the API_KEY environment variable. AI features will be disabled."
  );
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const generateTextSuggestion = async (prompt: string): Promise<string> => {
  if (!ai) {
    return "AI Service not available. API Key missing.";
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });
    
    // Ensure 'text' property exists and is a string.
    // As per documentation, response.text should directly give the string.
    const text = response.text;
    if (typeof text === 'string') {
      return text;
    } else {
      console.error("Unexpected response format from Gemini API:", response);
      return "Error: Could not extract text from AI response.";
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      return `Error generating suggestion: ${error.message}`;
    }
    return "An unknown error occurred while generating suggestion.";
  }
};

export const isAiAvailable = (): boolean => !!ai;
