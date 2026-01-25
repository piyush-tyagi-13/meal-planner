"""
config.py
Loads environment variables and provides configuration constants.
"""
import os

GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FAMILY_RECIPIENTS_EMAILS = os.getenv("FAMILY_RECIPIENTS_EMAILS", "").split(",")

# Toggle to enable/disable email sending (defaults to False for local runs)
SEND_EMAILS = os.getenv("SEND_EMAILS", "false").lower() == "true"

# File paths
RECIPES_FILE = "recipes.json"
PREVIOUS_DAY_MEALS_FILE = "previous_day_meals.json"
