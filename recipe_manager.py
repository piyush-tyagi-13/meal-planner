"""
recipe_manager.py
Handles recipe loading, meal selection, and previous day persistence.
"""
import json
import os
import random
from typing import List, Dict, Optional
from datetime import datetime
from config import RECIPES_FILE, PREVIOUS_DAY_MEALS_FILE

def load_recipes() -> List[Dict]:
    with open(RECIPES_FILE, encoding="utf-8") as f:
        return json.load(f)

def load_previous_day_meals() -> List[Dict]:
    if not os.path.exists(PREVIOUS_DAY_MEALS_FILE):
        return []
    with open(PREVIOUS_DAY_MEALS_FILE, encoding="utf-8") as f:
        return json.load(f)

def save_previous_day_meals(meals: List[Dict]):
    with open(PREVIOUS_DAY_MEALS_FILE, "w", encoding="utf-8") as f:
        json.dump(meals, f, indent=2, ensure_ascii=False)

def select_meals(recipes: List[Dict], previous_day_meals: List[Dict], meal_times: List[str]) -> Dict[str, Dict]:
    """
    Selects a unique recipe for each meal time, ensuring:
    - No recipe from previous day is used for any meal.
    - No recipe is repeated within the same day.
    - Only eligible recipes for each meal time are considered.
    Returns a dict: {meal_time: recipe_dict or None}
    """
    previous_names = set([m['name'] for m in previous_day_meals])
    selected = {}
    used_names = set()
    for meal_time in meal_times:
        eligible = [r for r in recipes if meal_time in r['mealTimeEligibility']
                    and r['name'] not in previous_names
                    and r['name'] not in used_names]
        if eligible:
            recipe = random.choice(eligible)
            selected[meal_time] = recipe
            used_names.add(recipe['name'])
        else:
            selected[meal_time] = None
    return selected

def meals_to_persistence_format(selected_meals: Dict[str, Optional[Dict]]) -> List[Dict]:
    """Converts selected meals to persistence format."""
    return [
        {"name": recipe['name'], "meal_time": meal_time}
        for meal_time, recipe in selected_meals.items() if recipe
    ]

def get_ingredients_for_meals(selected_meals: Dict[str, Optional[Dict]]) -> List[str]:
    """Returns a sorted list of unique ingredients for the given meals."""
    ingredients = set()
    for recipe in selected_meals.values():
        if recipe and 'ingredients' in recipe:
            ingredients.update(recipe['ingredients'])
    return sorted(ingredients)
