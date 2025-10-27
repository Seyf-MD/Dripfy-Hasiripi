import { GoogleGenAI } from "@google/genai";
import { DashboardData } from '../types';

// Per coding guidelines, the API key must be obtained exclusively from the environment variable `process.env.API_KEY`.
// We must assume this variable is pre-configured and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function* streamDashboardInsights(query: string, dataContext: { activeView: string } & DashboardData) {

  const model = "gemini-2.5-flash";

  const systemInstruction = `You are 'Dripfy AI', a friendly and expert assistant for the 'Dripfy MIS Dashboard'.
    - Your primary role is to answer user questions based *only* on the JSON data context provided.
    - The context contains all data from the dashboard, including schedule, financials, challenges, advantages, contacts, and tasks. It also includes the 'activeView' which tells you what tab the user is currently looking at.
    - When answering, be conversational and helpful.
    - Use markdown for formatting, such as **bolding** for key terms or numbers, and bullet points (-) for lists.
    - Analyze the provided JSON data thoroughly to find the answer.
    - If the information is in the data, provide a clear and concise answer.
    - If the information is not available in the provided data, state that clearly. For example: "I couldn't find that information in the dashboard data."
    - Do not make up information or answer questions outside the scope of the provided data.
    - All monetary values are in Euros (€).`;

  try {
    const response = await ai.models.generateContentStream({
        model: model,
        contents: `CONTEXT: ${JSON.stringify(dataContext, null, 2)}\n\nQUESTION: ${query}`,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.3,
        }
    });

    for await (const chunk of response) {
      yield chunk.text;
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    yield "Sorry, I encountered an error while processing your request. Please check the console for details.";
  }
};