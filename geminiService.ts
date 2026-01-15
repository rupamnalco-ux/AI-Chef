
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences, MealPlan, DayOfWeek, MealSlot } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

const EMPTY_PLAN: MealPlan = {
  Monday: { Breakfast: null, Lunch: null, Dinner: null },
  Tuesday: { Breakfast: null, Lunch: null, Dinner: null },
  Wednesday: { Breakfast: null, Lunch: null, Dinner: null },
  Thursday: { Breakfast: null, Lunch: null, Dinner: null },
  Friday: { Breakfast: null, Lunch: null, Dinner: null },
  Saturday: { Breakfast: null, Lunch: null, Dinner: null },
  Sunday: { Breakfast: null, Lunch: null, Dinner: null },
};

/**
 * Generates a high-quality image using the Gemini Image model
 */
const generateAIImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional food photography shot of ${prompt}, high resolution, appetizing, 4k.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    // Fallback if no image part found
    return `https://loremflickr.com/800/600/food,${prompt.replace(/\s/g, ',')}`;
  } catch (error) {
    console.error("Image generation failed:", error);
    return `https://loremflickr.com/800/600/food,${prompt.replace(/\s/g, ',')}`;
  }
};

const fullRecipeSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    prepTime: { type: Type.STRING },
    cookTime: { type: Type.STRING },
    servings: { type: Type.NUMBER },
    calories: { type: Type.STRING },
    matchPercentage: { type: Type.NUMBER },
    difficulty: { type: Type.STRING, enum: ["Easy", "Med", "Hard"] },
    ingredients: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING },
          amount: { type: Type.STRING }
        }
      } 
    },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.STRING },
        carbs: { type: Type.STRING },
        fats: { type: Type.STRING }
      }
    }
  }
};

const gridRecipeSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    calories: { type: Type.STRING },
    prepTime: { type: Type.STRING },
    difficulty: { type: Type.STRING, enum: ["Easy", "Med", "Hard"] },
    ingredients: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING },
          amount: { type: Type.STRING }
        }
      } 
    },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

export const generateRecipesFromPantry = async (ingredients: string[], prefs: UserPreferences): Promise<Recipe[]> => {
  try {
    const prompt = `Generate 3 recipe recommendations based on: ${ingredients.join(', ')}. Preferences: ${prefs.dietType}, avoid ${prefs.allergies.join(', ')}. Skill: ${prefs.skillLevel}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: fullRecipeSchema
        }
      }
    });

    const jsonStr = (response.text || "[]").trim();
    const results = JSON.parse(jsonStr);
    
    // Generate AI images for each recommendation
    const recipesWithImages = await Promise.all(results.map(async (r: any) => ({
      ...r,
      image: await generateAIImage(r.title)
    })));
    
    return recipesWithImages;
  } catch (error: any) {
    console.error("Gemini Recipe Generation Error:", error);
    throw error;
  }
};

export const generateWeeklyPlan = async (ingredients: string[], prefs: UserPreferences): Promise<MealPlan> => {
  try {
    const prompt = `Generate a full 7-day meal plan (Breakfast, Lunch, Dinner). 
    Pantry: ${ingredients.join(', ')}. 
    Prefs: ${prefs.dietType}, no ${prefs.allergies.join(', ')}.
    Format: A flat list of 21 meal objects.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, enum: DAYS },
                  slot: { type: Type.STRING, enum: SLOTS },
                  recipe: gridRecipeSchema
                }
              }
            }
          }
        }
      }
    });

    const jsonStr = (response.text || "{}").trim();
    const data = JSON.parse(jsonStr);
    const plan: MealPlan = JSON.parse(JSON.stringify(EMPTY_PLAN));

    if (data.meals && Array.isArray(data.meals)) {
      data.meals.forEach((item: any) => {
        if (item.day && item.slot && item.recipe && item.recipe.title) {
          const r = item.recipe;
          // For the weekly plan, we use keyword-based images for speed
          const imageUrl = `https://loremflickr.com/400/300/cooked,food,${r.title.replace(/\s/g, ',')}`;
          
          plan[item.day as DayOfWeek][item.slot as MealSlot] = {
            ...r,
            id: r.id || Math.random().toString(36).substr(2, 9),
            description: r.description || `${r.title} prepared in under ${r.prepTime}.`,
            image: imageUrl,
            cookTime: r.cookTime || '15m',
            servings: r.servings || 2,
            matchPercentage: r.matchPercentage || 90,
            nutrition: r.nutrition || { protein: '20g', carbs: '30g', fats: '10g' },
            tags: r.tags || ['Home Cooked']
          } as Recipe;
        }
      });
    }

    return plan;
  } catch (error: any) {
    console.error("Gemini Weekly Plan Error:", error);
    throw error;
  }
};

export const suggestATwist = async (recipe: Recipe): Promise<string> => {
  try {
    const prompt = `Recipe: ${recipe.title}. Give a creative "twist" (max 2 sentences).`;
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return (response.text || "Add a pinch of smoked paprika for depth.").trim();
  } catch (error) { return "Add fresh herbs to brighten it up."; }
};
