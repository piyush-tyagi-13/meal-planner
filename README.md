# Daily Family Meal Mailer

A Python project that generates a unique daily meal plan (Breakfast, Lunch, Dinner) for your family, emails the plan with recipes, and lists ingredients needed for the next day's meals. Designed to run automatically via GitHub Actions every morning at 7 AM IST.

## Features
- Loads recipes from a JSON file (`recipes.json`).
- Selects meals for each mealtime, ensuring:
  - No recipe is repeated from the previous day.
  - No recipe is repeated within the same day.
  - Only eligible recipes for each meal time are considered.
- Sends a modern, professional HTML email with:
  - Today's meal plan and recipes.
  - Ingredients to stock up for tomorrow.
  - **A motivational quote for the current month, with author, selected from `quotes.json`.**
- Persists the previous day's meals for constraint enforcement.
- Fully automated via GitHub Actions, including auto-commit of state.

## Project Structure
```
meal-planner/
├── config.py                  # Loads environment variables and file paths
├── email_service.py           # Builds and sends the HTML email (uses quotes.json for monthly quotes)
├── main.py                    # Orchestrates the workflow
├── previous_day_meals.json    # Stores previous day's meals (auto-managed)
├── recipe_manager.py          # Handles recipe loading, meal selection, and persistence
├── recipes.json               # Your recipe data (edit this file)
├── quotes.json                # Monthly motivational quotes with author
├── requirements.txt           # Python dependencies
└── .github/
    └── workflows/
        └── daily_mailer.yml   # GitHub Actions workflow
```

## Setup & Usage

### 1. Prepare Your Recipes
- Edit `recipes.json` to add your recipes. Each recipe must have:
  - `name`: Recipe name
  - `mealTimeEligibility`: List of meal times (e.g., `["breakfast", "lunch"]`)
  - `ingredients`: List of ingredients
  - `recipe`: Recipe instructions

### 2. Add Monthly Quotes
- Edit `quotes.json` to add or update motivational quotes for each month. Each entry must have:
  - `month`: Full month name (e.g., `"May"`)
  - `quote`: The quote text
  - `author`: The person who said the quote
- The email footer will display the quote and author for the current month.

### 3. Configure GitHub Secrets
Set these repository secrets in **Settings → Secrets and variables → Actions**:
- `GMAIL_SENDER_EMAIL`: The Gmail address to send emails from
- `GMAIL_APP_PASSWORD`: [Google App Password](https://support.google.com/accounts/answer/185833?hl=en) for the sender Gmail
- `FAMILY_RECIPIENTS_EMAILS`: Comma-separated list of recipient emails (e.g., `user1@example.com,user2@example.com`)
- `GH_PAT`: A [Personal Access Token](https://github.com/settings/tokens) with `repo` write access (for auto-committing state)

### 4. GitHub Actions Workflow
- The workflow runs every day at **7 AM IST** (1:00 UTC) and can also be triggered manually.
- It installs dependencies, runs the script, sends the email, and commits `previous_day_meals.json`.

### 5. Local Testing
- Create a `.env` file in the project root with the same variables as above for local runs.
- Run `python main.py` to test locally. The email will be sent to the configured recipients.

## Modern Recipe Manager GUI

A modern, tabular, and intuitive recipe management GUI is now available using Python and ttkbootstrap (open source, no license required).

### Features
- Import/export your `recipes.json` file
- Add, edit, and delete recipes
- Recipes displayed in a sortable, scrollable table
- Double-click a row to edit a recipe
- Modern look and feel (no trial, no paid features)

### How to Use
1. Install dependencies (only needed once):
   ```powershell
   pip install ttkbootstrap
   ```
2. Run the GUI:
   ```powershell
   python recipe_gui.py
   ```

### Screenshots
*Add your own screenshots here if desired.*

### Notes
- All data is stored in standard JSON files for easy backup and sharing.
- The GUI is cross-platform and works on Windows, Mac, and Linux.
- No proprietary or paid libraries are used.

---

For any issues or feature requests, please open an issue or contact the maintainer.

## Example Email
- Modern, clean HTML styling
- Subject: `🍽️ Family Meal Plan for Wednesday, 28 May 2025`
- Sections for each meal and tomorrow's ingredients
- **Footer displays a motivational quote for the current month, with the author's name.**

## License
MIT

---
**Stay healthy and enjoy your meals!**