
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  calories: string;
  matchPercentage: number;
  difficulty: 'Easy' | 'Med' | 'Hard';
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tags: string[];
  nutrition: {
    protein: string;
    carbs: string;
    fats: string;
  };
}

export interface UserProfile {
  fullName: string;
  email: string;
  username: string;
  bio: string;
  avatar: string;
}

export interface UserPreferences {
  dietType: 'Omnivore' | 'Vegetarian' | 'Vegan' | 'Pescetarian';
  allergies: string[];
  dislikes: string[];
  skillLevel: 'Beginner' | 'Home Cook' | 'Intermediate' | 'Advanced' | 'Pro Chef';
}

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type MealPlan = Record<DayOfWeek, Record<MealSlot, Recipe | null>>;

export type ViewState = 'landing' | 'pantry' | 'recommendations' | 'recipe-details' | 'cookbook' | 'shopping-list' | 'profile';
