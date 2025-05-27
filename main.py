"""
main.py
Entry point for the Daily Family Meal Mailer. Orchestrates meal selection, email generation, and persistence.
"""
import sys
from datetime import datetime, timedelta
from config import PREVIOUS_DAY_MEALS_FILE
from recipe_manager import (
    load_recipes, load_previous_day_meals, save_previous_day_meals,
    select_meals, meals_to_persistence_format, get_ingredients_for_meals
)
from email_service import build_email_html, send_email
import os
from dotenv import load_dotenv

print("DEBUG: CWD =", os.getcwd())
print("DEBUG: .env exists?", os.path.exists('.env'))
load_dotenv()

def main():
    meal_times = ["breakfast", "lunch", "dinner"]
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")

    # 1. Load data
    recipes = load_recipes()
    previous_day_meals = load_previous_day_meals()

    # 2. Select today's meals
    today_meals = select_meals(recipes, previous_day_meals, meal_times)

    # 3. Prepare tomorrow's meals (simulate, do not persist)
    today_persistence = meals_to_persistence_format(today_meals)
    tomorrow_meals = select_meals(recipes, today_persistence, meal_times)
    tomorrow_ingredients = get_ingredients_for_meals(tomorrow_meals)

    # 4. Build and send email
    from config import FAMILY_RECIPIENTS_EMAILS
    print(f"DEBUG: FAMILY_RECIPIENTS_EMAILS = {FAMILY_RECIPIENTS_EMAILS!r}")
    if not FAMILY_RECIPIENTS_EMAILS or FAMILY_RECIPIENTS_EMAILS == ['']:
        print("No recipient emails configured. Exiting.")
        sys.exit(1)
    # Format date as 'Wednesday, 28 May 2025' for subject
    try:
        pretty_date = today.strftime("%A, %d %B %Y")
    except Exception:
        pretty_date = date_str
    subject = f"🍽️ Family Meal Plan for {pretty_date}"
    html_body = build_email_html(today_meals, tomorrow_ingredients, date_str)
    print("--- EMAIL PREVIEW ---")
    print(html_body)
    print("--- END EMAIL PREVIEW ---")
    send_email(subject, html_body)
    print(f"Email sent to: {', '.join(FAMILY_RECIPIENTS_EMAILS)}")

    # 5. Persist today's meals for tomorrow's run
    save_previous_day_meals(today_persistence)
    print(f"Updated {PREVIOUS_DAY_MEALS_FILE} for tomorrow's constraint.")

if __name__ == "__main__":
    main()
