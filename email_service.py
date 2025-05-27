"""
email_service.py
Builds and sends the HTML email for the daily meal plan.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Optional, List
from datetime import datetime
from config import GMAIL_SENDER_EMAIL, GMAIL_APP_PASSWORD, FAMILY_RECIPIENTS_EMAILS

def build_email_html(today_meals: Dict[str, Optional[Dict]], tomorrow_ingredients: List[str], date_str: str) -> str:
    """
    Builds a modern, professional HTML email body for the meal plan and ingredients list.
    """
    # Format date as 'Wednesday, 28 May 2025'
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        pretty_date = date_obj.strftime("%A, %d %B %Y")
    except Exception:
        pretty_date = date_str

    def meal_section(meal_time, recipe):
        if recipe:
            return f"""
            <div class='meal-block'>
              <div class='meal-title'>{meal_time.title()}: <span class='meal-name'>{recipe['name']}</span></div>
              <div class='meal-recipe'><b>Recipe:</b> {recipe['recipe']}</div>
            </div>
            """
        else:
            return f"<div class='meal-block'><div class='meal-title'>{meal_time.title()}: <span class='meal-name missing'>No suitable meal found today.</span></div></div>"

    html = f"""
    <html>
    <head>
    <style>
      body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; color: #222; margin: 0; }}
      .container {{ background: #fff; max-width: 600px; margin: 40px auto; padding: 32px 28px 28px 28px; border-radius: 16px; box-shadow: 0 4px 24px #dbeafe; }}
      h2 {{ color: #2563eb; font-size: 2rem; margin-bottom: 0.5em; }}
      .date {{ color: #64748b; font-size: 1.1rem; margin-bottom: 1.5em; }}
      .section-title {{ margin-top: 2.5em; color: #334155; font-size: 1.2rem; font-weight: 600; letter-spacing: 0.5px; }}
      .meal-block {{ margin-bottom: 1.5em; padding: 1em; border-radius: 10px; background: #f1f5f9; box-shadow: 0 1px 4px #e0e7ef; }}
      .meal-title {{ font-size: 1.1rem; font-weight: 500; color: #0f172a; margin-bottom: 0.3em; }}
      .meal-name {{ color: #2563eb; font-weight: 600; }}
      .meal-name.missing {{ color: #e11d48; }}
      .meal-recipe {{ font-size: 1rem; color: #334155; margin-top: 0.2em; }}
      ul.ingredient-list {{ margin-top: 0.7em; margin-bottom: 0; padding-left: 1.2em; }}
      ul.ingredient-list li {{ font-size: 1rem; margin-bottom: 0.2em; }}
      .footer {{ margin-top: 2.5em; color: #64748b; font-size: 0.95rem; text-align: center; }}
    </style>
    </head>
    <body>
      <div class="container">
        <h2>🍽️ Tyagi Family Meal Plan</h2>
        <div class="date">{pretty_date}</div>
        <div class="section-title">Today's Meals</div>
        {meal_section('breakfast', today_meals.get('breakfast'))}
        {meal_section('lunch', today_meals.get('lunch'))}
        {meal_section('dinner', today_meals.get('dinner'))}
        <div class="section-title">Ingredients to Stock Up for Tomorrow</div>
        <ul class="ingredient-list">
          {''.join(f'<li>{ingredient}</li>' for ingredient in tomorrow_ingredients)}
        </ul>
        <div class="footer">
          <hr style="border:none;border-top:1px solid #e0e7ef;margin:2em 0 1em 0;" />
          <div>Stay healthy and enjoy your meals!<br>— Your Family Meal Planner Bot</div>
        </div>
      </div>
    </body>
    </html>
    """
    return html

def send_email(subject: str, html_body: str):
    """
    Sends the email using Gmail SMTP. Recipients and credentials are loaded from environment variables.
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = GMAIL_SENDER_EMAIL
    msg['To'] = ", ".join(FAMILY_RECIPIENTS_EMAILS)
    part = MIMEText(html_body, 'html')
    msg.attach(part)
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(GMAIL_SENDER_EMAIL, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_SENDER_EMAIL, FAMILY_RECIPIENTS_EMAILS, msg.as_string())
