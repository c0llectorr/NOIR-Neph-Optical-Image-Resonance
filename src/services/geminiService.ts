import { GoogleGenAI, Type } from "@google/genai";
import { ProcessingResult } from "../types";

export interface MediaInput {
  base64: string;
  mimeType: string;
}

/**
 * Generates a simple hash for a base64 string to use as a cache key.
 * This helps avoid redundant AI calls for the same image.
 */
export function getImageHash(base64: string): string {
  // Use a simple checksum approach for performance
  let hash = 0;
  const str = base64.slice(-1000); // Only hash the last part for speed
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function quickAnalyzeMediaVibe(mediaList: MediaInput[]): Promise<{ mood: string, genres: string[], keywords: string[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = "gemini-3-flash-preview";

  const prompt = `
    Analyze this image/video instantly. 
    Provide:
    1. A 3-word "Mood" (e.g., "Neon Rain Melancholy")
    2. Exactly 3 music genres that fit this vibe perfectly.
    3. Exactly 5 search keywords for finding related songs.
    Return JSON format: {"mood": "...", "genres": ["...", "...", "..."], "keywords": ["...", "...", "..."]}
  `;

  const mediaParts = mediaList.map((m) => ({
    inlineData: {
      data: m.base64.split(",")[1] || m.base64,
      mimeType: m.mimeType
    }
  }));

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }, ...mediaParts] }],
      config: { responseMimeType: "application/json" }
    });
    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (e) {
    // Check for 503 "model is currently experiencing high demand" error
    const errorMsg = (e instanceof Error ? e.message : String(e)) || "";
    if (errorMsg.includes('503') || errorMsg.toLowerCase().includes('unavailable') || errorMsg.toLowerCase().includes('demand')) {
      console.warn("Gemini 503 (High Demand) during quick analysis. Returning defaults.");
    } else {
      console.warn("Quick analysis failed, falling back to default vibe", e);
    }
    return { mood: "Cinematic Atmosphere", genres: ["Lofi", "Electronic", "Ambient"], keywords: ["Vibe", "Chill", "Modern"] };
  }
}

export async function analyzeMediaVibe(mediaList: MediaInput[], userInstruction?: string, previousSongs?: string[], languages: string[] = ["English"], artistFilter?: string): Promise<ProcessingResult> {
  // Always use process.env.GEMINI_API_KEY for Gemini API in React (Vite) as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const hasVideo = mediaList.some((m) => m.mimeType.startsWith('video/'));
  const mediaCount = mediaList.length;
  const modelName = "gemini-3-flash-preview";
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' });

  const selectedLangs = Array.isArray(languages) ? languages : [languages || "English"];
  
  // Blog language logic: Primary is always English. Secondary is the first non-English language selected.
  const secondaryLang = selectedLangs.find(l => l.toLowerCase() !== "english");
  const blogLangs = ["English"];
  if (secondaryLang) blogLangs.push(secondaryLang);

  const langContext = (selectedLangs.length > 1) 
    ? `the following languages: ${selectedLangs.join(", ")} (distribute recommendations across these languages)`
    : (selectedLangs.length === 1 && selectedLangs[0]) ? `the ${selectedLangs[0]} language STICK TO THIS LANGUAGE ONLY` : 'English';

  const translationPrompt = secondaryLang 
    ? `IMPORTANT: Write the "Advanced Sentiment Profile" (the blog) in TWO separate versions: 
       1. English Version: A sophisticated, poetic master narrative. Focus on the soul of the media.
       2. ${secondaryLang} Version: A faithful and emotive translation into ${secondaryLang}.
       Store the English version in "advancedSentimentProfile".
       ALSO store both versions in the "translatedSentimentProfile" object: {"English": "...", "${secondaryLang}": "..."}.`
    : `Write the "Advanced Sentiment Profile" (the blog) in English. Store it in "advancedSentimentProfile" and also in "translatedSentimentProfile" with the key "English".`;

  const artistConstraint = artistFilter 
    ? `- ARTIST OVERRIDE: You MUST suggest songs ONLY from the artist "${artistFilter}". For this specific request, IGNORE the "LANGUAGE RESONANCE" constraint for the song suggestions themselves, as the user prioritizes this specific artist's discography regardless of what language they sing in. However, the DJ Notes and Blog should still follow the English primary rule.`
    : `- LANGUAGE RESONANCE: You MUST suggest songs ONLY in ${langContext}. DO NOT suggest songs in any other language under any circumstances.`;

  const fullPrompt = `
    Current Date: ${currentDate}
    Act as a sophisticated triple-thread intelligence system:

    ${hasVideo ? `THREAD 1: THE AUDIO-VISUAL ANALYZER
    - Task: Perform a forensic and aesthetic analysis of the provided ${mediaCount} media item(s).
    - Media: There are ${mediaCount} assets. Look for consistency and variation across them.
    - Video Analysis: Identify frame movements, changes in lighting, subjects, attire, and spatial dynamics in any video files.
    - Audio Analysis: Listen to the background music, voice tones, environmental sounds, and tempo.
    - Focus: Capture the intersection of motion and sound. What collective story do these assets tell?` : `THREAD 1: THE VISUAL ANALYZER
    - Task: Perform a deep-dive forensic and aesthetic analysis of the ${mediaCount} provided image(s).
    - Asset Count: ${mediaCount} image(s).
    - Focus: Identify common themes, specific objects, subjects, attire, and the evolving "Hidden Aura" (the precise energy) across all files.`}

    ${hasVideo ? `THREAD 2: THE MULTIMODAL STORYTELLER
    - Task: Receive the forensic analysis from Thread 1.
    - Focus: Weave a cohesive narrative thread from the collective movements, audio atmospheres, and visual transitions. Tell the story of this sequence of moments.
    - Purpose: This narrative serves as the core emotional blueprint to inform the DJ's selection.` : `THREAD 2: THE VISUAL STORYTELLER
    - Task: Receive the forensic analysis from Thread 1.
    - Focus: Weave a cohesive narrative thread from all provided images, colors, and atmospheres. Instead of just listing objects, tell the "overarching story" of these moments (e.g., "A chronicle of a nomadic journey through urban landscapes").
    - Purpose: This narrative serves as the core emotional blueprint to inform the DJ's selection.`}

    THREAD 3: THE TRENDY DJ (Infinite Musical Library up to 2026)
    - Task: Receive the Narrative Blueprint from Thread 2.
    - Action: Brainstorm exactly 20 famous, high-energy/relevant songs by major artists (Pop, Hip-Hop, Alt-Indie, House, Afrobeat, etc.) that match the *real* narrative and mood.
    - Diversity: Avoid defaulting to obscure classical or slow music unless strictly literal. Think about what's "in" (e.g., SZA, Tame Impala, Fred again.., Bad Bunny, Kendrick Lamar, Charli XCX, etc.).
    - Pass-off: Give this list of 20 to the Analyzer.

    THREAD 4: THE SELECTION & THE MASTER WRITER
    - Selection: The Analyzer picks the TOP 10 from the DJ's list that have the highest "Resonance" with the visual subjects and the Storyteller's narrative.
    - Writing Task: Write the "Advanced Sentiment Profile" (the blog). This is a creative, persuasive, and evocative blog or story (150-200 words) about the collection of moments. 
    - Tone: Compelling, persuasive, and perspective-shifting. Help the user see their own content through a different, more profound lens.

    STRICT CONSTRAINTS:
    ${artistConstraint}
    - LATENCY: Be decisive. 
    - VIBE: If the content looks/sounds happy/social, suggest UPBEAT and POSITIVE music. No "fading" music for vibrant moments.
    - RECOMMENDATIONS: Provide EXACTLY 10 final songs.
    - FORMAT: The "advancedSentimentProfile" is your Blog/Story. Deliver it with maximum creative flair.
    ${translationPrompt}
    - COLORS: Identify exactly 4 dominant colors. For EACH color, provide a valid HEX code (e.g. #FF5733) and a psychological interpretation of why it fits the media.

    TARGET LANGUAGE FOR SONGS: ${selectedLangs.join(", ")}.
    TARGET LANGUAGE FOR BLOG: English ${secondaryLang ? `(and ${secondaryLang} as a secondary option)` : ''}.

    ${userInstruction ? `REFINEMENT INSTRUCTION: ${userInstruction}` : ""}
    ${previousSongs && previousSongs.length > 0 ? `STRICT EXCLUSION (DO NOT REPEAT THESE SONGS): ${previousSongs.join(", ")}` : ""}
  `;

  const mediaParts = mediaList.map((m) => ({
    inlineData: {
      data: m.base64.split(",")[1] || m.base64,
      mimeType: m.mimeType
    }
  }));

  const blogLangProperties: { [key: string]: any } = {};
  blogLangs.forEach(lang => {
    blogLangProperties[lang] = { type: Type.STRING };
  });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            { text: fullPrompt },
            ...mediaParts
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vibe: {
              type: Type.OBJECT,
              properties: {
                emotionalTone: { type: Type.STRING },
                complexSentiment: { type: Type.STRING },
                sentimentProfile: {
                  type: Type.OBJECT,
                  properties: {
                    apparentEmotion: { type: Type.STRING },
                    inferredEmotionalLayers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    visualSignals: {
                      type: Type.OBJECT,
                      properties: {
                        colorDynamics: { type: Type.STRING },
                        spatialComposition: { type: Type.STRING },
                        facialAndBodySignals: { type: Type.STRING },
                        symbolismAndMetaphors: { type: Type.STRING }
                      },
                      required: ["colorDynamics", "spatialComposition"]
                    }
                  },
                  required: ["apparentEmotion", "inferredEmotionalLayers", "visualSignals"]
                },
                advancedSentimentProfile: { type: Type.STRING },
                translatedSentimentProfile: {
                  type: Type.OBJECT,
                  properties: blogLangProperties,
                  required: blogLangs
                },
                visualObservations: {
                  type: Type.OBJECT,
                  properties: {
                    subjects: { type: Type.STRING },
                    attire: { type: Type.STRING },
                    composition: { type: Type.STRING },
                    atmosphere: { type: Type.STRING }
                  },
                  required: ["subjects", "attire", "composition", "atmosphere"]
                },
                activityLevel: { type: Type.NUMBER },
                energyLevel: { type: Type.NUMBER },
                symbolicResonance: { type: Type.STRING },
                inferredNarrativeIntention: { type: Type.STRING },
                colorInterpretations: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT,
                    properties: {
                      color: { type: Type.STRING, description: "HEX code of the color" },
                      interpretation: { type: Type.STRING }
                    },
                    required: ["color", "interpretation"]
                  } 
                },
                context: { type: Type.ARRAY, items: { type: Type.STRING } },
                aestheticStyle: { type: Type.STRING },
                colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                inferredIntent: { type: Type.STRING }
              },
              required: [
                "emotionalTone", "complexSentiment", "sentimentProfile", "energyLevel", 
                "advancedSentimentProfile", "translatedSentimentProfile", "visualObservations", "activityLevel", "symbolicResonance", 
                "inferredNarrativeIntention", "colorInterpretations", "context", 
                "aestheticStyle", "colors", "inferredIntent"
              ]
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  mood: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  vibeMatchScore: { type: Type.NUMBER },
                  previewUrl: { type: Type.STRING },
                  albumArt: { type: Type.STRING }
                },
                required: ["id", "title", "artist", "mood", "explanation", "vibeMatchScore"]
              }
            }
          },
          required: ["vibe", "recommendations"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI");
    }
    
    const parsed = JSON.parse(resultText);

    // Post-process: Ensure scores are bounded and recommendations are sorted
    const sortedRecommendations = (parsed.recommendations || [])
      .map((s: any) => ({
        ...s,
        id: `${s.title}_${s.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        vibeMatchScore: Math.min(100, Math.max(0, s.vibeMatchScore))
      }))
      .sort((a: any, b: any) => b.vibeMatchScore - a.vibeMatchScore);

    return {
      ...parsed,
      recommendations: sortedRecommendations,
      timestamp: new Date().toISOString(),
      imageUrl: mediaList.map(m => m.base64),
      selectedLanguages: languages,
      mediaType: mediaList.some(m => m.mimeType.startsWith('video/')) ? 'video' : 'image',
      mediaTypes: mediaList.map(m => m.mimeType.startsWith('video/') ? 'video' : 'image')
    } as ProcessingResult;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Check for 503 "model is currently experiencing high demand" error
    const errorMsg = (error instanceof Error ? error.message : String(error)) || "";
    if (errorMsg.includes('503') || errorMsg.toLowerCase().includes('unavailable') || errorMsg.toLowerCase().includes('demand')) {
      throw new Error("Gemini AI is currently under heavy load (503). This is typically temporary. Please try your search again in a few moments.");
    }
    
    throw new Error(error.message || "Failed to analyze vibe with AI");
  }
}
