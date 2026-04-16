import { GoogleGenAI } from "@google/genai";

// Safe way to get API key in both Node and Browser environments
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {}
  
  try {
    if (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) {
      return (import.meta as any).env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {}
  
  return 'AIzaSyB4N1KHI1daTv9UAvX1Ibv2qFLqZBZSIeY';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function suggestTasks(project: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3 professional, highly detailed task templates for a project named "${project}" in a task management app. 
      Return the response as a JSON array of objects with the following fields:
      - "title": A clear, actionable task title.
      - "description": A detailed description of what needs to be done.
      - "priority": "High", "Medium", or "Low".
      - "dueDate": "Today", "Tomorrow", or "Next Week".
      - "recurring": "None", "Daily", "Weekly", or "Monthly".
      - "subtasks": An array of strings representing sub-steps to complete the task.
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Gemini suggestion error:", error);
    return [];
  }
}

export async function chatWithBot(message: string, onTaskCreate?: (task: any) => void) {
  try {
    let contents: any = message;

    const createTaskDeclaration = {
      name: "createTask",
      description: "Create a new task in the task management system. Use this when the user asks to create a task, schedule something, or add a reminder.",
      parameters: {
        type: "OBJECT" as any,
        properties: {
          title: { type: "STRING" as any, description: "The title of the task." },
          description: { type: "STRING" as any, description: "Detailed description of the task." },
          priority: { type: "STRING" as any, description: "Priority of the task: 'High', 'Medium', or 'Low'." },
          dueDate: { type: "STRING" as any, description: "Due date in YYYY-MM-DD format." },
          recurring: { type: "STRING" as any, description: "Recurring rule: 'None', 'Daily', 'Weekly', or 'Monthly'." }
        },
        required: ["title"]
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: "You are Routine AI, a helpful assistant. You can answer questions, scrape data from the web using Google Search, and create tasks for the user.",
        tools: [{ googleSearch: {} }, { functionDeclarations: [createTaskDeclaration as any] }],
        toolConfig: { includeServerSideToolInvocations: true } as any
      }
    });

    let reply = response.text;

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === 'createTask' && onTaskCreate) {
          const args = call.args as any;
          onTaskCreate(args);
          reply = `I have created the task: "${args.title}".`;
        }
      }
    }

    return reply;
  } catch (error) {
    console.error("Gemini chat error:", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}
export async function parseVoiceToTask(voiceInput: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following voice command (which may be in Hindi, Hinglish, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, or English) into a task object. 
      Command: "${voiceInput}"
      
      Return a JSON object with the following fields:
      - "title": A concise, professional English translation of the task title.
      - "description": A slightly more detailed description in English (optional).
      - "priority": "High", "Medium", or "Low" (infer from urgency words like "urgent", "jaldi", etc., default to "Medium").
      - "recurring": "None", "Daily", "Weekly", or "Monthly" (infer from words like "raat ko", "roz", "everyday", "har din", etc.).
      - "dueDate": "Today", "Tomorrow", or a specific date if mentioned (optional).
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return null;
  } catch (error) {
    console.error("Gemini voice parsing error:", error);
    return null;
  }
}
