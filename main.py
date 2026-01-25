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
    from config import FAMILY_RECIPIENTS_EMAILS, SEND_EMAILS
    print(f"DEBUG: SEND_EMAILS = {SEND_EMAILS}")
    print(f"DEBUG: FAMILY_RECIPIENTS_EMAILS = {FAMILY_RECIPIENTS_EMAILS!r}")
    
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
    
    if SEND_EMAILS:
        if not FAMILY_RECIPIENTS_EMAILS or FAMILY_RECIPIENTS_EMAILS == ['']:
            print("No recipient emails configured. Exiting.")
            sys.exit(1)
        send_email(subject, html_body)
        print(f"Email sent to: {', '.join(FAMILY_RECIPIENTS_EMAILS)}")
    else:
        # Save email as HTML file instead of sending
        mail_folder = os.path.join(os.path.dirname(__file__), "mail")
        os.makedirs(mail_folder, exist_ok=True)
        html_filename = f"meal_plan_{date_str}.html"
        html_path = os.path.join(mail_folder, html_filename)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_body)
        print(f"📄 Email saved as HTML: {html_path}")
        print("   (Open in browser to view or print to PDF)")

    # 5. Persist today's meals for tomorrow's run
    save_previous_day_meals(today_persistence)
    print(f"Updated {PREVIOUS_DAY_MEALS_FILE} for tomorrow's constraint.")

if __name__ == "__main__":
    main()
