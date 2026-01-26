# Tyagi Family Meal Planner - Developer Setup Guide

This guide is for the repository administrator to get the **Tyagi Family Meal Planner** live and functional.

## 🚀 One-Time Repository Setup

Everything is already built and pre-configured with your credentials. You only need to enable hosting:

1. **Push your changes**: Ensure all new files (especially the `webapp/` folder) are pushed to your GitHub repository.
2. **Enable GitHub Pages**:
   - Go to your repo on GitHub: `https://github.com/piyush-tyagi-13/meal-planner`.
   - Click **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to "Deploy from a branch".
   - Set **Branch** to `MobileAppVersion` and the folder to `/docs`.
   - Click **Save**.
3. **Wait for Deployment**: Within a minute, GitHub will provide a URL (e.g., `https://piyush-tyagi-13.github.io/meal-planner/`). This is your live app!

---

## 🔒 Security & Credentials

The app uses **Persistent Sync**. For security, the GitHub Token is **not baked into the code**.
- **Hardcoded**: Username (`piyush-tyagi-13`) and Repository (`meal-planner`).
- **User-Provided**: The first time someone opens the app, they must enter a **GitHub Personal Access Token (PAT)**.

This token is stored locally on the device's browser (`localStorage`) and is never shared or stored elsewhere.

### 🔑 Requirement: GitHub PAT
To use the app, provide a token with the `repo` scope. You can generate it [here](https://github.com/settings/tokens/new?scopes=repo&description=MealPlanner).

---

## 📱 Mobile Installation (For your family)

Share your GitHub Pages URL with the family. They can "install" it by:
- **iPhone**: Open in Safari → **Share** → **Add to Home Screen**.
- **Android**: Open in Chrome → **Three dots** → **Add to Home Screen**.

---

## 🛠️ Maintenance

- **Email Logic**: The daily automation runs via GitHub Actions (`.github/workflows/daily_mailer.yml`).
- **Secrets Required**:
    - `GMAIL_SENDER_EMAIL`: Your Gmail address.
    - `GMAIL_APP_PASSWORD`: A Gmail App Password (Settings → Security → 2FA → App Passwords).
    - `GH_PAT`: Your GitHub Personal Access Token (for the automation to push updates).
- **Data Persistence**: Recipes are stored in `recipes.json` and family members in `config.json`.
