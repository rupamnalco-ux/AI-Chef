
import React from 'react';

export const INITIAL_PREFERENCES = {
  dietType: 'Vegetarian' as const,
  allergies: ['Shellfish', 'Tree Nuts'],
  dislikes: ['Olives'],
  skillLevel: 'Intermediate' as const,
};

export const COMMON_STAPLES = [
  { name: 'Eggs', icon: 'egg', color: 'orange' },
  { name: 'Milk', icon: 'water_full', color: 'blue' },
  { name: 'Chicken', icon: 'set_meal', color: 'red' },
  { name: 'Rice', icon: 'rice_bowl', color: 'yellow' },
  { name: 'Tomatoes', icon: 'nutrition', color: 'red' },
  { name: 'Onion', icon: 'radio_button_checked', color: 'purple' },
  { name: 'Cheese', icon: 'local_pizza', color: 'yellow' },
  { name: 'Garlic', icon: 'spa', color: 'gray' },
];

export const MOCK_RECIPES = [
  {
    id: '1',
    title: 'Lemon Herb Chicken Rice',
    description: 'A zesty and fresh dinner using your chicken breast, rice, and bell peppers.',
    image: 'https://s3.amazonaws.com/grazecart/fergusonfarmbirds/images/1722814703_66b010efef97b.jpg',
    prepTime: '30m',
    cookTime: '20m',
    servings: 2,
    calories: '450 kcal',
    matchPercentage: 98,
    difficulty: 'Easy' as const,
    ingredients: [{ name: 'Chicken breast', amount: '500g' }, { name: 'Rice', amount: '1 cup' }],
    steps: ['Prepare the aromatics. Pound the garlic and herbs together.', 'Sear the chicken in a hot wok.', 'Season and finish with lemon zest.'],
    tags: ['Quick', 'Fresh'],
    nutrition: { protein: '28g', carbs: '45g', fats: '12g' }
  },
  {
    id: '2',
    title: 'Stuffed Bell Peppers',
    description: 'Classic comfort food. Uses your bell peppers as the vessel for a savory rice and chicken mix.',
    image: 'https://hips.hearstapps.com/hmg-prod/images/stuffed-peppers-recipe-2-6594706a0a63b.jpg?crop=0.8888888888888888xw:1xh;center,top&resize=1200:*',
    prepTime: '45m',
    cookTime: '30m',
    servings: 4,
    calories: '380 kcal',
    matchPercentage: 85,
    difficulty: 'Med' as const,
    ingredients: [{ name: 'Bell Peppers', amount: '4 large' }, { name: 'Ground meat', amount: '300g' }],
    steps: ['Clean the peppers.', 'Prepare the stuffing mixture.', 'Roast until tender.'],
    tags: ['Comfort Food', 'Healthy'],
    nutrition: { protein: '15g', carbs: '40g', fats: '10g' }
  }
];
