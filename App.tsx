
import React, { useState, useMemo, useEffect } from 'react';
import {
  ViewState,
  Ingredient,
  Recipe,
  UserPreferences,
  UserProfile,
  MealPlan,
  DayOfWeek,
  MealSlot
} from './types';
import {
  INITIAL_PREFERENCES,
  COMMON_STAPLES,
  MOCK_RECIPES
} from './constants';
import {
  generateRecipesFromPantry,
  generateWeeklyPlan
} from './geminiService';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner'];
const SKILL_LEVELS: UserPreferences['skillLevel'][] = ['Beginner', 'Home Cook', 'Intermediate', 'Advanced', 'Pro Chef'];

const EMPTY_PLAN: MealPlan = {
  Monday: { Breakfast: null, Lunch: null, Dinner: null },
  Tuesday: { Breakfast: null, Lunch: null, Dinner: null },
  Wednesday: { Breakfast: null, Lunch: null, Dinner: null },
  Thursday: { Breakfast: null, Lunch: null, Dinner: null },
  Friday: { Breakfast: null, Lunch: null, Dinner: null },
  Saturday: { Breakfast: null, Lunch: null, Dinner: null },
  Sunday: { Breakfast: null, Lunch: null, Dinner: null },
};

const Navbar: React.FC<{
  currentView: ViewState;
  onNavigate: (view: ViewState) => void
}> = ({ currentView, onNavigate }) => {
  const [clickCount, setClickCount] = useState(0);

  const handleGetStarted = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    // "more than 2 times click" -> on the 3rd click (count > 2)
    if (newCount > 2) {
      onNavigate('landing');
      setClickCount(0); // Reset after successful redirect?
    } else {
      onNavigate('pantry');
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap bg-white/80 backdrop-blur-md px-6 py-4 lg:px-16 border-b border-slate-100 transition-colors duration-200 print:hidden">
      <div className="flex items-center gap-12">
        <div
          className="flex items-center gap-2 text-primary cursor-pointer"
          onClick={() => onNavigate('landing')}
        >
          <div className="size-8 flex items-center justify-center bg-primary rounded-lg">
            <span className="material-symbols-outlined !text-[20px] text-white font-black">nutrition</span>
          </div>
          <h2 className="text-xl font-black leading-tight tracking-[-0.03em] text-slate-900">CookAI</h2>
        </div>
        {currentView !== 'landing' && (
          <nav className="hidden md:flex items-center gap-8">
            {[
              { id: 'recommendations', label: 'Recipes' },
              { id: 'shopping-list', label: 'Meal Planner' },
              { id: 'pantry', label: 'My Pantry' },
              { id: 'profile', label: 'Profile' }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id as ViewState)}
                className={`text-sm font-bold tracking-tight transition-colors ${currentView === link.id ? 'text-primary' : 'text-slate-600 hover:text-primary'
                  }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-6">
        <button className="text-sm font-black text-slate-900">Log In</button>
        <button
          onClick={handleGetStarted}
          className="bg-primary text-white text-sm font-black px-6 py-2.5 rounded-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
        >
          Get Started
        </button>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="w-full py-12 text-center text-slate-400 text-sm border-t border-slate-100 bg-white mt-auto print:hidden">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">restaurant</span>
        <span className="font-black text-xl text-slate-900">CookAI</span>
      </div>
      <p>© 2024 CookAI. All culinary rights reserved.</p>
    </div>
  </footer>
);

const DifficultyBadge: React.FC<{ level: 'Easy' | 'Med' | 'Hard' }> = ({ level }) => {
  const colors = {
    Easy: 'bg-green-100 text-green-700',
    Med: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colors[level]}`}>
      {level}
    </span>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>(JSON.parse(JSON.stringify(EMPTY_PLAN)));
  const [recommendations, setRecommendations] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);

  // Updated avatar with the provided image URL
  const initialProfile: UserProfile = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    username: 'chef_jane',
    bio: 'Avid home cook and AI enthusiast exploring the world of gourmet flavors.',
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocL8_Q3yG7Z5S5X_V9v-5y1z3_8_L7_p_q_S_q_8=s96-c'
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [savedUserProfile, setSavedUserProfile] = useState<UserProfile>(initialProfile);
  const [savedPreferences, setSavedPreferences] = useState<UserPreferences>(preferences);

  const [isGenerating, setIsGenerating] = useState(false);
  const [hideInPantry, setHideInPantry] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const [profileSubView, setProfileSubView] = useState<'general' | 'security' | 'dietary' | 'notifications'>('general');
  const [allergyInput, setAllergyInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');

  const shoppingItems = useMemo(() => {
    const items: Record<string, { name: string; amount: number; unit: string; recipes: string[]; category: string }> = {};
    if (!mealPlan) return [];

    Object.values(mealPlan).forEach(day => {
      if (!day) return;
      Object.values(day).forEach(recipe => {
        if (!recipe) return;
        recipe.ingredients.forEach(ing => {
          const key = ing.name.toLowerCase().trim();
          const amountMatch = ing.amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
          const qty = amountMatch ? parseFloat(amountMatch[1]) : 1;
          const unit = amountMatch ? amountMatch[2].trim() : (ing.amount || 'unit');

          if (!items[key]) {
            items[key] = { name: ing.name, amount: 0, unit, recipes: [], category: 'Other' };
            const name = key;
            if (name.includes('tomato') || name.includes('pepper') || name.includes('onion') || name.includes('spinach')) items[key].category = 'Produce';
            else if (name.includes('milk') || name.includes('cheese') || name.includes('egg')) items[key].category = 'Dairy';
            else if (name.includes('chicken') || name.includes('beef') || name.includes('tofu')) items[key].category = 'Proteins';
            else if (name.includes('oil') || name.includes('rice') || name.includes('pasta')) items[key].category = 'Pantry';
          }
          items[key].amount += qty;
          if (!items[key].recipes.includes(recipe.title)) items[key].recipes.push(recipe.title);
        });
      });
    });

    let result = Object.values(items);
    if (hideInPantry) {
      const pantryNames = pantry.map(p => p.name.toLowerCase());
      result = result.filter(item => !pantryNames.some(pn => item.name.toLowerCase().includes(pn)));
    }
    return result;
  }, [mealPlan, pantry, hideInPantry]);

  const handleAddToPantry = (name: string) => {
    if (!name.trim()) return;
    const existing = pantry.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setPantry(pantry.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setPantry([...pantry, { id: Date.now().toString(), name, quantity: 1, unit: 'unit', category: 'Pantry' }]);
    }
  };

  const handleAutoPlan = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const plan = await generateWeeklyPlan(pantry.map(p => p.name), preferences);
      setMealPlan({ ...EMPTY_PLAN, ...plan });
    } catch (e: any) {
      console.error("Gemini Weekly Plan Error:", e);
      if (e?.status === "RESOURCE_EXHAUSTED" || e?.message?.includes('quota')) {
        setErrorMessage(
          "API Quota exceeded. Please check your plan and billing details."
        );
        setMealPlan(JSON.parse(JSON.stringify(EMPTY_PLAN)));
      } else {
        setErrorMessage("ChefAI had a hiccup during planning: " + (e.message || "Unknown error."));
        setMealPlan(JSON.parse(JSON.stringify(EMPTY_PLAN)));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const addToSlot = (recipe: Recipe) => {
    if (pendingSlot) {
      setMealPlan(prev => ({
        ...prev,
        [pendingSlot.day]: { ...prev[pendingSlot.day], [pendingSlot.slot]: recipe }
      }));
      setPendingSlot(null);
      setView('shopping-list');
    } else {
      setMealPlan(prev => ({ ...prev, Monday: { ...prev.Monday, Dinner: recipe } }));
      setView('shopping-list');
    }
  };

  const handleProfileSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSavedUserProfile({ ...userProfile });
      setSavedPreferences({ ...preferences });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const handleGeneralProfileClear = () => {
    setUserProfile({ ...userProfile, fullName: '', username: '', email: '', bio: '' });
    setSaveStatus('idle');
  };

  const handleProfileCancel = () => {
    setUserProfile({ ...savedUserProfile });
    setPreferences({ ...savedPreferences });
    setSaveStatus('idle');
  };

  const exportAsText = () => {
    const text = shoppingItems
      .map(item => `${item.name}: ${Math.round(item.amount * 10) / 10} ${item.unit}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const exportAsPDF = () => {
    window.print();
  };

  const renderLanding = () => (
    <div className="relative overflow-hidden bg-background-light">
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/4 rounded-full bg-primary/5 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/4 rounded-full bg-blue-400/5 blur-[100px]"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="flex flex-col gap-8 max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-green-800 w-fit mx-auto lg:mx-0">
                  <span className="material-symbols-outlined text-[16px]">eco</span>
                  <span>New: Smart Pantry Integration</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-text-main sm:text-5xl xl:text-6xl !leading-[1.1]">
                  Turn What's in Your Fridge Into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-primary">Week of Great Meals</span>
                </h1>
                <p className="text-lg text-slate-500 sm:text-xl max-w-lg mx-auto lg:mx-0">
                  AI-powered recipes, meal plans, and shopping lists built around your ingredients, diet, and schedule.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => setView('pantry')}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-bold text-slate-900 shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:-translate-y-0.5"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => setView('pantry')}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-8 text-base font-bold text-text-main shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  See How It Works
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 w-10 overflow-hidden rounded-full border-[3px] border-white bg-slate-200">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-primary text-xs font-bold text-slate-900">
                    +2k
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <div className="flex text-yellow-400 text-[14px]">
                    {[1, 2, 3, 4, 5].map(i => <span key={i} className="material-symbols-outlined fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                  </div>
                  <p className="text-sm font-medium text-slate-400">Trusted by 10,000+ home cooks</p>
                </div>
              </div>
            </div>

            <div className="relative w-full lg:h-auto perspective-1000">
              <div className="absolute -right-4 top-10 -z-10 h-full w-full rounded-2xl bg-primary/20 blur-xl"></div>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-transform hover:scale-[1.01] duration-500">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  <div className="ml-2 h-2 w-32 rounded-full bg-slate-200"></div>
                </div>
                <div className="aspect-[4/3] w-full bg-cover bg-top relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop')" }}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur border border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                        <span className="material-symbols-outlined">auto_awesome</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Suggestion</p>
                        <p className="text-sm font-bold text-slate-900">Avocado & Tomato Toast with Poached Egg</p>
                        <p className="text-xs text-green-600 font-medium mt-0.5">Using ingredients from your fridge</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 hidden lg:flex items-center gap-3 rounded-xl bg-white p-4 shadow-2xl border border-slate-100 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-xs">🍅</div>
                  <div className="h-8 w-8 rounded-full bg-yellow-100 border-2 border-white flex items-center justify-center text-xs">🧀</div>
                  <div className="h-8 w-8 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-xs">🥬</div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Pantry Scan</p>
                  <p className="text-sm font-bold text-slate-900">Completed</p>
                </div>
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return renderLanding();
      case 'pantry':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-[1400px] mx-auto w-full flex-1">
            <div className="flex flex-col lg:flex-row gap-16">
              <div className="flex-1 flex flex-col gap-10">
                <div className="flex flex-col gap-3">
                  <h1 className="text-6xl font-[900] tracking-tighter text-slate-900 leading-tight">Let's find you a recipe.</h1>
                  <p className="text-xl font-medium text-primary-dark">Add ingredients you have, and we'll suggest what to cook.</p>
                </div>
                <div className="flex h-16 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <div className="flex items-center px-4 text-slate-400"><span className="material-symbols-outlined">search</span></div>
                  <input id="pantry-search-input" className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium" placeholder="Eggs, Spinach, Chicken..." onKeyDown={e => e.key === 'Enter' && (handleAddToPantry((e.target as HTMLInputElement).value), (e.target as HTMLInputElement).value = '')} />
                  <button onClick={() => { const i = document.getElementById('pantry-search-input') as HTMLInputElement; handleAddToPantry(i.value); i.value = ''; }} className="bg-primary hover:bg-primary-hover px-10 text-white font-black text-lg">Add</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {COMMON_STAPLES.map((staple) => (
                    <div key={staple.name} onClick={() => handleAddToPantry(staple.name)} className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:shadow-xl transition-all group">
                      <div className="size-16 rounded-full flex items-center justify-center bg-slate-50 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-3xl" style={{ color: staple.color }}>{staple.icon}</span></div>
                      <span className="font-black text-slate-800 text-lg">{staple.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-[450px]">
                <div className="sticky top-28 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div><h3 className="text-2xl font-[900] text-slate-900">Your Pantry</h3><p className="text-sm font-bold text-primary-dark">{pantry.length} items</p></div>
                    <button onClick={() => setPantry([])} className="size-10 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete_sweep</span></button>
                  </div>
                  <div className="p-4 max-h-[400px] overflow-y-auto flex flex-col gap-2">
                    {pantry.length === 0 ? <p className="py-20 text-center opacity-30 font-bold">Your pantry is empty.</p> : pantry.map(item => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                        <div className="flex-1 font-black text-slate-900 truncate">{item.name}</div>
                        <div className="flex items-center bg-white border border-slate-100 rounded-xl px-2 py-1">
                          <button onClick={() => setPantry(p => p.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))} className="size-8">-</button>
                          <span className="w-8 text-center font-black">{item.quantity}</span>
                          <button onClick={() => setPantry(p => p.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="size-8">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-8">
                    <button onClick={async () => {
                      setIsGenerating(true);
                      setErrorMessage(null);
                      try {
                        const recs = await generateRecipesFromPantry(pantry.map(p => p.name), preferences);
                        setRecommendations(recs);
                        setView('recommendations');
                      } catch (e: any) {
                        console.error("Gemini Recipe Generation Error:", e);
                        setErrorMessage("Error fetching recipes. Please check your API usage.");
                        setRecommendations([]);
                      } finally {
                        setIsGenerating(false);
                      }
                    }} disabled={pantry.length === 0} className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-all">Find Recipes</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'recommendations':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto w-full">
            <h1 className="text-4xl font-black mb-10 text-slate-900">{pendingSlot ? `Choosing for ${pendingSlot.day}` : 'Gourmet Recommendations'}</h1>
            {errorMessage && (
              <div className="p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl font-bold flex items-center gap-3 mb-6" role="alert">
                <span className="material-symbols-outlined">warning</span>
                <p>{errorMessage}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recommendations.length === 0 ? (
                <div className="col-span-full py-32 text-center border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center gap-6 opacity-40">
                  <span className="material-symbols-outlined text-8xl">restaurant_menu</span>
                  <p className="text-2xl font-black">No recipes found. Try adding more ingredients to your pantry.</p>
                  <button onClick={() => setView('pantry')} className="text-primary font-black text-lg hover:underline">Go to My Pantry</button>
                </div>
              ) : (
                recommendations.map(recipe => (
                  <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setView('recipe-details'); }} className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100">
                    <img src={recipe.image} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700" alt={recipe.title} />
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-black">{recipe.title}</h3>
                        <DifficultyBadge level={recipe.difficulty} />
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-2">{recipe.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        );

      case 'shopping-list':
        return (
          <main className="flex-1 p-6 md:px-20 py-12 max-w-[1600px] mx-auto w-full flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 print:hidden">
              <div><h1 className="text-6xl font-[900] tracking-tighter text-slate-900">Control Room</h1><p className="text-xl font-medium text-primary-dark">Your week, mastered.</p></div>
              <div className="flex gap-4">
                <button onClick={handleAutoPlan} className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all">Plan My Week</button>
                <button onClick={() => setMealPlan(JSON.parse(JSON.stringify(EMPTY_PLAN)))} className="bg-white border-2 border-slate-100 text-red-500 font-black px-8 py-4 rounded-2xl hover:bg-red-50">Clear Plan</button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              <div className="xl:col-span-8 flex flex-col gap-10 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
                  {DAYS.map(day => (
                    <div key={day} className="flex flex-col gap-4">
                      <div className="bg-slate-900 text-white p-3 rounded-xl text-center font-black text-[10px] uppercase tracking-widest">{day.slice(0, 3)}</div>
                      {SLOTS.map(slot => {
                        const meal = mealPlan?.[day]?.[slot];
                        return (
                          <div key={slot} onClick={() => { if (meal) { setSelectedRecipe(meal); setView('recipe-details'); } else { setPendingSlot({ day, slot }); setView('recommendations'); } }} className={`relative aspect-[3/4] sm:aspect-auto sm:h-52 rounded-2xl border-2 flex flex-col transition-all cursor-pointer group overflow-hidden ${meal ? 'border-transparent shadow-lg' : 'border-dashed border-slate-100 bg-slate-50/50'}`}>
                            {meal ? (
                              <><img src={meal.image} className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40" /><div className="mt-auto p-4 relative z-10"><p className="text-[9px] font-black text-primary uppercase mb-1">{slot}</p><h4 className="text-white font-black text-xs line-clamp-2">{meal.title}</h4></div></>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
                                <span className="text-[9px] font-black text-slate-300 uppercase">{slot}</span>
                                <div className="size-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors"><span className="material-symbols-outlined">add</span></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="xl:col-span-4 flex flex-col gap-8 print:col-span-12">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col sticky top-28 print:static print:border-none print:shadow-none print:rounded-none">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 print:bg-white print:p-4">
                    <div><h3 className="text-2xl font-black text-slate-900">Smart List</h3><p className="text-sm font-bold text-slate-400">{shoppingItems.length} items</p></div>
                    <span className="material-symbols-outlined print:hidden">shopping_cart</span>
                  </div>
                  <div className="flex-1 p-6 flex flex-col gap-8 max-h-[500px] overflow-y-auto print:max-h-none print:p-4">
                    {shoppingItems.length === 0 ? <p className="py-20 text-center opacity-30 font-bold">Your list is empty.</p> : ['Produce', 'Dairy', 'Proteins', 'Pantry', 'Other'].map(cat => {
                      const items = shoppingItems.filter(i => i.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat} className="flex flex-col gap-4">
                          <h4 className="text-[10px] font-black text-primary uppercase tracking-widest print:text-slate-900 print:text-base print:mb-2">{cat}</h4>
                          <div className="flex flex-col gap-2">{items.map(item => (
                            <div key={item.name} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 print:bg-white print:border-b print:rounded-none print:p-2">
                              <input type="checkbox" className="size-5 rounded border-slate-200 text-primary focus:ring-primary print:hidden" />
                              <div className="flex-1 min-w-0 font-black text-slate-900 truncate print:text-sm">{item.name}</div>
                              <div className="text-xs font-black text-primary bg-white px-2 py-1 rounded shadow-sm print:text-slate-600 print:bg-transparent print:shadow-none print:font-bold">{Math.round(item.amount * 10) / 10} {item.unit}</div>
                            </div>
                          ))}</div>
                        </div>
                      );
                    })}
                  </div>
                  {shoppingItems.length > 0 && (
                    <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex flex-col gap-4 print:hidden">
                      <div className="flex items-center gap-4">
                        <button onClick={exportAsText} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-black py-4 rounded-2xl hover:bg-slate-50 transition-all relative">
                          <span className={`material-symbols-outlined ${copySuccess ? 'hidden' : 'block'}`}>content_copy</span>
                          <span>{copySuccess ? 'Copied!' : 'Copy List'}</span>
                        </button>
                        <button onClick={exportAsPDF} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all">
                          <span className="material-symbols-outlined">picture_as_pdf</span>
                          PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <main className="w-full max-w-7xl mx-auto px-6 py-10 flex flex-col gap-10 print:hidden">
            <section className="rounded-[3rem] overflow-hidden relative min-h-[550px] flex items-end shadow-2xl bg-slate-900 group">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${selectedRecipe.image}')` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="relative z-10 p-16 w-full flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-6xl font-black text-white leading-tight">{selectedRecipe.title}</h1>
                    <DifficultyBadge level={selectedRecipe.difficulty} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => addToSlot(selectedRecipe)} className="bg-primary text-white px-10 py-5 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">Add to Plan</button>
                  <button onClick={() => setView('recommendations')} className="bg-white/10 backdrop-blur-md text-white px-10 py-5 rounded-2xl font-black border border-white/20">Back</button>
                </div>
              </div>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <aside className="lg:col-span-4 flex flex-col gap-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm">
                  <h3 className="text-2xl font-black mb-8">Ingredients</h3>
                  <div className="flex flex-col gap-6">{selectedRecipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-4"><span className="font-bold text-slate-800">{ing.name}</span><span className="text-primary font-black">{ing.amount}</span></div>
                  ))}</div>
                </div>

                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-sm">
                  <h3 className="text-2xl font-black mb-8">Nutrition</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="font-bold opacity-60">Protein</span>
                      <span className="font-black text-primary">{selectedRecipe.nutrition.protein}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="font-bold opacity-60">Carbs</span>
                      <span className="font-black text-primary">{selectedRecipe.nutrition.carbs}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="font-bold opacity-60">Fats</span>
                      <span className="font-black text-primary">{selectedRecipe.nutrition.fats}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold opacity-60">Calories</span>
                      <span className="font-black text-xl">{selectedRecipe.calories}</span>
                    </div>
                  </div>
                </div>
              </aside>
              <div className="lg:col-span-8 flex flex-col gap-8">
                <h2 className="text-3xl font-black uppercase">Steps</h2>
                {selectedRecipe.steps.map((step, i) => (
                  <div key={i} className="bg-white p-8 rounded-3xl border border-slate-50 flex gap-6">
                    <div className="size-12 rounded-full bg-primary text-white font-black text-2xl flex items-center justify-center shrink-0">{i + 1}</div>
                    <p className="text-slate-600 font-medium leading-relaxed pt-2">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        );

      case 'profile':
        const renderProfileSubView = () => {
          switch (profileSubView) {
            case 'general':
              return (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm flex flex-col gap-10">
                  <div className="flex items-center gap-8">
                    <div className="relative group">
                      <img src={userProfile.avatar} className="size-32 rounded-full object-cover border-4 border-slate-50 shadow-inner group-hover:brightness-75 transition-all" alt="Avatar" />
                      <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl font-black">photo_camera</span>
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h4 className="text-lg font-black text-slate-900">Profile Picture</h4>
                      <div className="flex gap-3 mt-2">
                        <button className="text-xs font-black text-primary-dark bg-primary/10 px-4 py-2 rounded-lg">Upload New</button>
                        <button className="text-xs font-black text-red-500 bg-red-50 px-4 py-2 rounded-lg">Remove</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                      <input type="text" value={userProfile.fullName} onChange={(e) => setUserProfile({ ...userProfile, fullName: e.target.value })} className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Username</label>
                      <input type="text" value={userProfile.username} onChange={(e) => setUserProfile({ ...userProfile, username: e.target.value })} className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                      <input type="email" value={userProfile.email} onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })} className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Biography</label>
                    <textarea rows={4} value={userProfile.bio} onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })} className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20 resize-none" />
                  </div>
                  <div className="pt-8 border-t border-slate-50 flex justify-end items-center gap-6">
                    <button onClick={handleGeneralProfileClear} className="min-w-[140px] py-4 px-8 rounded-xl font-black bg-red-500 text-white shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">restart_alt</span> Reset
                    </button>
                    <button onClick={handleProfileSave} className={`min-w-[180px] py-4 rounded-xl font-black shadow-xl transition-all ${saveStatus === 'success' ? 'bg-primary-dark text-white' : 'bg-primary text-white'}`}>
                      {saveStatus === 'idle' && 'Save Changes'}
                      {saveStatus === 'saving' && 'Saving...'}
                      {saveStatus === 'success' && 'Saved!'}
                    </button>
                  </div>
                </div>
              );
            case 'security':
              return (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm flex flex-col gap-10">
                  <div className="flex flex-col gap-8">
                    <h3 className="text-2xl font-black text-slate-900">Change Password</h3>
                    <div className="grid grid-cols-1 gap-6 max-w-md">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                        <input type="password" placeholder="••••••••" className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">New Password</label>
                        <input type="password" placeholder="••••••••" className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirm New Password</label>
                        <input type="password" placeholder="••••••••" className="bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-black focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-8 border-t border-slate-50 flex flex-col gap-6">
                    <h3 className="text-2xl font-black text-slate-900">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                      <div>
                        <p className="font-black text-slate-900">Email Verification</p>
                        <p className="text-sm text-slate-500">Secure your account by requiring an email code at login.</p>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button onClick={handleProfileSave} className="min-w-[180px] py-4 rounded-xl font-black shadow-xl bg-primary text-white">Update Security</button>
                  </div>
                </div>
              );
            case 'dietary':
              return (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm flex flex-col gap-12">
                  <div className="flex flex-col gap-6">
                    <h3 className="text-2xl font-black text-slate-900">Diet Type</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {['Omnivore', 'Vegetarian', 'Vegan', 'Pescetarian'].map((type) => (
                        <button key={type} onClick={() => setPreferences({ ...preferences, dietType: type as any })} className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${preferences.dietType === type ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                          <span className="material-symbols-outlined text-3xl text-primary">{type === 'Omnivore' ? 'restaurant' : type === 'Vegetarian' ? 'eco' : type === 'Vegan' ? 'spa' : 'set_meal'}</span>
                          <h4 className="font-black text-slate-900">{type}</h4>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="flex flex-col gap-4">
                      <h3 className="text-xl font-black text-slate-900">Allergies</h3>
                      <div className="flex h-14 bg-slate-50 rounded-xl overflow-hidden px-4 gap-2 focus-within:ring-2 focus-within:ring-primary/20">
                        <input
                          type="text"
                          value={allergyInput}
                          onChange={(e) => setAllergyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && allergyInput.trim()) {
                              setPreferences({ ...preferences, allergies: [...preferences.allergies, allergyInput.trim()] });
                              setAllergyInput('');
                            }
                          }}
                          placeholder="Add allergy..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold"
                        />
                        <button onClick={() => {
                          if (allergyInput.trim()) {
                            setPreferences({ ...preferences, allergies: [...preferences.allergies, allergyInput.trim()] });
                            setAllergyInput('');
                          }
                        }} className="text-primary font-black">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {preferences.allergies.map((allergy, i) => (
                          <div key={i} className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                            {allergy}
                            <button onClick={() => setPreferences({ ...preferences, allergies: preferences.allergies.filter((_, idx) => idx !== i) })} className="material-symbols-outlined !text-[14px]">close</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h3 className="text-xl font-black text-slate-900">Dislikes</h3>
                      <div className="flex h-14 bg-slate-50 rounded-xl overflow-hidden px-4 gap-2 focus-within:ring-2 focus-within:ring-primary/20">
                        <input
                          type="text"
                          value={dislikeInput}
                          onChange={(e) => setDislikeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && dislikeInput.trim()) {
                              setPreferences({ ...preferences, dislikes: [...preferences.dislikes, dislikeInput.trim()] });
                              setDislikeInput('');
                            }
                          }}
                          placeholder="Add dislike..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold"
                        />
                        <button onClick={() => {
                          if (dislikeInput.trim()) {
                            setPreferences({ ...preferences, dislikes: [...preferences.dislikes, dislikeInput.trim()] });
                            setDislikeInput('');
                          }
                        }} className="text-primary font-black">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {preferences.dislikes.map((dislike, i) => (
                          <div key={i} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border border-slate-200">
                            {dislike}
                            <button onClick={() => setPreferences({ ...preferences, dislikes: preferences.dislikes.filter((_, idx) => idx !== i) })} className="material-symbols-outlined !text-[14px]">close</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 mt-4 border-t border-slate-50 flex justify-end items-center gap-6">
                    <button onClick={handleProfileCancel} className="min-w-[140px] py-4 px-8 rounded-xl font-black bg-red-500 text-white shadow-xl hover:bg-red-600 transition-all">Cancel</button>
                    <button onClick={handleProfileSave} className="min-w-[180px] py-4 rounded-xl font-black shadow-xl bg-primary text-white">Save Preferences</button>
                  </div>
                </div>
              );
            case 'notifications':
              return (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm flex flex-col gap-10">
                  <div className="flex flex-col gap-6">
                    <h3 className="text-2xl font-black text-slate-900">Notification Channels</h3>
                    <div className="flex flex-col gap-4">
                      {[
                        { id: 'email', title: 'Email Notifications', desc: 'Weekly recipe highlights and meal plan summaries.' },
                        { id: 'push', title: 'Push Notifications', desc: 'Daily reminders for your planned meals.' },
                        { id: 'marketing', title: 'Marketing & Tips', desc: 'Get culinary inspiration and pro tips from our chefs.' },
                      ].map((n) => (
                        <div key={n.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                          <div>
                            <p className="font-black text-slate-900">{n.title}</p>
                            <p className="text-sm text-slate-500">{n.desc}</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked={n.id !== 'marketing'} />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-8 border-t border-slate-50 flex justify-end">
                    <button onClick={handleProfileSave} className="min-w-[180px] py-4 rounded-xl font-black shadow-xl bg-primary text-white">Update Notifications</button>
                  </div>
                </div>
              );
            default: return null;
          }
        };

        return (
          <main className="flex-1 max-w-[1400px] mx-auto p-6 md:p-12 w-full flex flex-col lg:flex-row gap-12">
            <aside className="lg:w-72 flex flex-col gap-8 shrink-0">
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-black text-primary-dark uppercase tracking-widest mb-4 ml-4">Account Settings</h4>
                {[
                  { id: 'general', icon: 'person', label: 'General Profile' },
                  { id: 'security', icon: 'lock', label: 'Password & Security' },
                  { id: 'dietary', icon: 'restaurant_menu', label: 'Dietary Preferences' },
                  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setProfileSubView(item.id as any)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all border-l-4 ${profileSubView === item.id
                        ? 'bg-primary/10 text-primary-dark border-primary shadow-sm'
                        : 'text-slate-400 border-transparent hover:bg-slate-50 hover:text-slate-600'
                      }`}
                  >
                    <span className="material-symbols-outlined !text-[22px]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-auto p-8 bg-slate-50 rounded-3xl border border-slate-100 hidden lg:block">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">verified_user</span>
                  </div>
                  <p className="font-black text-xs text-slate-900">Pro Account</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-4">You have unlimited recipe generations and full meal planning access.</p>
                <button className="text-[10px] font-black text-primary-dark hover:underline uppercase tracking-widest">Manage Subscription</button>
              </div>
            </aside>
            <div className="flex-1 flex flex-col gap-8">{renderProfileSubView()}</div>
          </main>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfc] text-slate-900 flex flex-col font-display">
      <Navbar currentView={view} onNavigate={v => { setView(v); setSelectedRecipe(null); setErrorMessage(null); }} />
      <main className="flex-1 flex flex-col">{renderContent()}</main>
      <Footer />
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-8 text-center max-w-sm w-full">
            <div className="size-20 border-[6px] border-primary border-t-transparent rounded-full animate-spin" />
            <div><h4 className="font-black text-2xl text-slate-900">CookAI is thinking...</h4><p className="text-slate-500 font-medium mt-2">Personalizing your culinary week.</p></div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          @page { margin: 2cm; }
          body { background: white !important; font-family: 'Noto Sans', sans-serif !important; }
          #root { display: block !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
