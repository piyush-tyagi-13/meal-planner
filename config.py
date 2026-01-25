"""
config.py
Loads environment variables and provides configuration constants.
"""
import os

# File paths
RECIPES_FILE = "recipes.json"
CONFIG_FILE = "config.json"
PREVIOUS_DAY_MEALS_FILE = "previous_day_meals.json"

GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

# Load recipients from config.json (preferred) or fallback to Environment Variable
FAMILY_RECIPIENTS_EMAILS = os.getenv("FAMILY_RECIPIENTS_EMAILS", "").split(",")
if os.path.exists(CONFIG_FILE):
    import json
    try:
        with open(CONFIG_FILE, "r") as f:
            config_data = json.load(f)
            recipients = config_data.get("recipients", [])
            if recipients:
                FAMILY_RECIPIENTS_EMAILS = recipients
    except Exception:
        pass

# Toggle to enable/disable email sending (defaults to False for local runs)
SEND_EMAILS = os.getenv("SEND_EMAILS", "false").lower() == "true"
