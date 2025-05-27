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
    Builds a modern HTML email body for the meal plan and ingredients list.
    """
    def meal_section(meal_time, recipe):
        if recipe:
            return f"""
            <h3>{meal_time.title()}: {recipe['name']}</h3>
            <p><b>Recipe:</b> {recipe['recipe']}</p>
            """
        else:
            return f"<h3>{meal_time.title()}: No suitable meal found today.</h3>"

    html = f"""
    <html>
    <head>
    <style>
      body {{ font-family: Arial, sans-serif; background: #f9f9f9; color: #222; }}
      .container {{ background: #fff; max-width: 600px; margin: 30px auto; padding: 24px; border-radius: 10px; box-shadow: 0 2px 8px #eee; }}
      h2 {{ color: #2a7ae2; }}
      ul {{ margin-top: 0; }}
      .section-title {{ margin-top: 32px; color: #444; }}
    </style>
    </head>
    <body>
      <div class="container">
        <h2>Daily Meal Plan - {date_str}</h2>
        <div class="section-title"><b>Today's Meals:</b></div>
        {meal_section('breakfast', today_meals.get('breakfast'))}
        {meal_section('lunch', today_meals.get('lunch'))}
        {meal_section('dinner', today_meals.get('dinner'))}
        <div class="section-title"><b>Ingredients to Stock Up for Tomorrow:</b></div>
        <ul>
          {''.join(f'<li>{ingredient}</li>' for ingredient in tomorrow_ingredients)}
        </ul>
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
