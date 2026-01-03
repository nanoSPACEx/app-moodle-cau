import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not set in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMoodleContent = async (
  itemTitle: string,
  baseContext: string,
  customInstructions: string,
  globalContext: string,
  onStream: (chunk: string) => void
): Promise<string> => {
  try {
    const ai = getClient();
    const model = "gemini-3-flash-preview"; 
    
    const systemInstruction = `
      Ets un expert en pedagogia i disseny instruccional per a Moodle, especialitzat en Cultura Audiovisual. 
      El teu objectiu és generar contingut educatiu d'alta qualitat, estructurat i llest per ser utilitzat en un curs.
      
      ESTIL I TO:
      - Professional, motivador i clar.
      - Adapta el llenguatge a estudiants de secundària/batxillerat.
      - Utilitza format Markdown (negretes, llistes, títols) per millorar la llegibilitat.
    `;

    // Constructing the prompt with priority logic
    let contentSources = `CONTEXT DEL TEMARI (BASE): "${baseContext}"`;
    
    if (globalContext && globalContext.trim().length > 0) {
      contentSources = `
      !!! IMPORTANT: HAS DE BASAR-TE PRIORITÀRIAMENT EN LA SEGÜENT DOCUMENTACIÓ PROPORCIONADA PER L'USUARI !!!
      
      --- INICI DOCUMENTACIÓ/BIBLIOGRAFIA EXTRA ---
      ${globalContext}
      --- FI DOCUMENTACIÓ/BIBLIOGRAFIA EXTRA ---

      CONTEXT SECUNDARI (Utilitzar només si falta informació a la documentació anterior):
      "${baseContext}"
      `;
    }

    const prompt = `
      TASCA: Generar el contingut complet per al recurs del curs titulat: "${itemTitle}"
      
      ${contentSources}
      
      INSTRUCCIONS ESPECÍFIQUES DE L'USUARI:
      ${customInstructions ? customInstructions : "Cap instrucció addicional."}
      
      FORMAT DE SORTIDA REQUERIT:
      Si és un Qüestionari: Llista les preguntes numerades i indica clarament la resposta correcta.
      Si és una Tasca: Defineix els Objectius, Descripció de l'activitat, Format de lliurament i Criteris d'avaluació (Rúbrica simple).
      Si és un Fòrum: Redacta el missatge inicial del professor per obrir el debat.
      Si és una Pàgina/Lliçó: Desenvolupa el contingut teòric amb introducció, punts clau i conclusió o exemples basats en la documentació.
    `;

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onStream(fullText);
      }
    }
    return fullText;

  } catch (error) {
    console.error("Error calling Gemini:", error);
    return `Error generating content: ${(error as Error).message}. Please check your API key.`;
  }
};

// --- New Features ---

export interface SearchResult {
  text: string;
  sources: { uri: string; title: string }[];
}

export const searchWithGrounding = async (query: string): Promise<SearchResult> => {
  const ai = getClient();
  // Using gemini-3-flash-preview with googleSearch tool as requested
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "No s'ha trobat informació rellevant.";
  
  // Extract grounding chunks (URLs)
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks
    .filter((c: any) => c.web?.uri)
    .map((c: any) => ({
      uri: c.web.uri,
      title: c.web.title || c.web.uri
    }));

  return { text, sources };
};

export const getChatSession = () => {
  const ai = getClient();
  // Using gemini-3-pro-preview for complex reasoning/chat as requested
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `Ets un tutor virtual expert en Cultura Audiovisual. 
      La teva missió és ajudar estudiants i professors a resoldre dubtes, aprofundir en conceptes de cinema, fotografia, publicitat i mitjans.
      Sigues didàctic, pacient i utilitza exemples pràctics.`,
    },
  });
};