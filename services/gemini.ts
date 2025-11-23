import { GoogleGenAI, Chat } from "@google/genai";

// Initialize the client
// Note: process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const INSTRUCTION_TEXT = `
You are an expert logistics assistant for Habchi Trading Pty Ltd. 
Your goal is to assist staff in following the "Unloading Container Instruction Report Requirement".

Here are the rules you must know:
1. Users must take a picture of the seal while on the container door.
2. Users must take a picture of the container number on the inside (right hand side) with produce showing in the background when the door is open.
3. As goods are removed, a random carton must be selected for:
   - A picture of the carton with labelling.
   - A picture of the produce inside the open carton.
   - A picture of the temperature probe in the product showing the reading.
4. Users must locate the Temperature Log (usually on the last pallet) and remove it for collection.
5. Reports are emailed to admin@hfresh.com.au and CC'd to admin@hphfresh.com.
6. The Subject Line must contain the Container Number.

Answer questions concisely and professionally.
`;

let chatSession: Chat | null = null;

export const getChatSession = () => {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: INSTRUCTION_TEXT,
      },
    });
  }
  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const session = getChatSession();
    const response = await session.sendMessage({ message });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error connecting to the AI service.";
  }
};

export const analyzeImageWithGemini = async (file: File, prompt: string): Promise<string> => {
  try {
    // Convert File to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No analysis result returned.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return "Failed to analyze the image. Please try again.";
  }
};
