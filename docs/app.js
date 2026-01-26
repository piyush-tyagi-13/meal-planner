// Tyagi Family Meal Planner - GitHub Cloud Sync

const App = {
    // PRE-CONFIGURED REPOSITORY (Token must be provided by user)
    settings: {
        pat: '', // Loaded from localStorage
        owner: 'piyush-tyagi-13',
        repo: 'meal-planner',
        branch: 'MobileAppVersion' // Specifically target this branch
    },

    recipes: [],
    recipients: [],
    recipesSha: null,
    configSha: null,
    editingRecipeIndex: null,
    activeCategory: 'all', // For recipe filtering

    init() {
        this.loadTheme();
        this.loadToken();
        this.bindEvents();

        if (!this.settings.pat) {
            this.showSetupModal();
        } else {
            this.loadData();
        }
    },

    loadTheme() {
        const theme = localStorage.getItem('tyagi_meal_planner_theme') || 'light';
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('tyagi_meal_planner_theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('tyagi_meal_planner_theme', 'dark');
        }
    },

    loadToken() {
        this.settings.pat = localStorage.getItem('tyagi_meal_planner_token') || '';
    },

    saveToken(token) {
        this.settings.pat = token;
        localStorage.setItem('tyagi_meal_planner_token', token);
    },

    async githubAPI(path, method = 'GET', body = null) {
        let url = `https://api.github.com/repos/${this.settings.owner}/${this.settings.repo}/contents/${path}`;

        // CACHE BUSTING: Add a unique timestamp to every GET request
        if (method === 'GET') {
            const cacheBuster = Date.now();
            url += `?ref=${this.settings.branch}&t=${cacheBuster}`;
        }

        const headers = {
            'Authorization': `token ${this.settings.pat}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        if (!response.ok) {
            if (response.status === 404 && method === 'GET') return null;
            throw new Error('Cloud sync error');
        }
        return response.json();
    },

    async loadFile(filename) {
        const data = await this.githubAPI(filename);
        if (!data) return null;
        const content = decodeURIComponent(escape(atob(data.content)));
        return { content: JSON.parse(content), sha: data.sha };
    },

    async saveFile(filename, content, sha, message) {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(contentStr))),
            sha,
            branch: this.settings.branch
        };
        return this.githubAPI(filename, 'PUT', body);
    },

    async loadData() {
        this.showLoading(true);
        try {
            // Load recipes (Required)
            const recipesData = await this.loadFile('recipes.json');
            if (recipesData) {
                this.recipes = recipesData.content;
                this.recipesSha = recipesData.sha;
            }

            // Load config (Optional)
            try {
                const configData = await this.loadFile('config.json');
                if (configData) {
                    this.recipients = configData.content.recipients || [];
                    this.configSha = configData.sha;
                }
            } catch (e) {
                console.warn('config.json not found or unavailable, skipping.');
            }

            this.renderRecipes();
            this.renderRecipients();
            this.loadWorkflowSchedule(); // Load schedule on data sync
        } catch (e) {
            console.error('Load error:', e);
            this.showToast('⚠️ Data sync failed');
        } finally {
            this.showLoading(false);
        }
    },

    renderRecipes(filter = '') {
        const list = document.getElementById('recipes-list');
        const searchTerm = (filter || document.getElementById('recipe-search').value).toLowerCase();

        const filtered = this.recipes.filter(r => {
            const matchesCategory = this.activeCategory === 'all' ||
                (r.mealTimeEligibility || []).includes(this.activeCategory);

            const matchesSearch = r.name.toLowerCase().includes(searchTerm) ||
                r.ingredients?.some(i => i.toLowerCase().includes(searchTerm));

            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><span>🍱</span><p>No ${this.activeCategory !== 'all' ? this.activeCategory : ''} recipes found</p></div>`;
            return;
        }

        list.innerHTML = filtered.map((recipe, idx) => {
            const realIndex = this.recipes.indexOf(recipe);
            return `
                <div class="card" onclick="App.editRecipe(${realIndex})">
                    <div class="card-header">
                        <div class="card-title">${this.escapeHtml(recipe.name)}</div>
                        <div class="badge">${(recipe.mealTimeEligibility || []).join(' • ')}</div>
                    </div>
                    
                    <span class="card-section-label">Ingredients</span>
                    <div class="card-ingredients">
                        ${(recipe.ingredients || []).join(', ')}
                    </div>
                    
                    <span class="card-section-label">Preparation</span>
                    <div class="card-recipe-container">
                        <p class="card-recipe">${this.escapeHtml(recipe.recipe || 'No instructions provided.')}</p>
                    </div>

                    <div class="card-actions">
                         <button class="btn btn-danger" onclick="event.stopPropagation(); App.deleteRecipe(${realIndex})">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderRecipients() {
        const list = document.getElementById('recipients-list');
        if (this.recipients.length === 0) {
            list.innerHTML = `<div class="empty-state"><span>📧</span><p>No family members added</p></div>`;
            return;
        }
        list.innerHTML = this.recipients.map((email, idx) => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding: 16px;">
                <span style="font-weight:600">${this.escapeHtml(email)}</span>
                <button class="btn btn-danger" onclick="App.deleteRecipient(${idx})">Remove</button>
            </div>
        `).join('');
    },

    async saveRecipe(e) {
        e.preventDefault();
        this.showLoading(true);

        const name = document.getElementById('recipe-name').value.trim();
        const ingredients = document.getElementById('recipe-ingredients').value.split('\n').map(i => i.trim()).filter(i => i);
        const instructions = document.getElementById('recipe-instructions').value.trim();
        const mealTimes = Array.from(document.querySelectorAll('[name="mealTime"]:checked')).map(cb => cb.value);

        const recipe = {
            id: this.editingRecipeIndex !== null ? this.recipes[this.editingRecipeIndex].id : `R${Date.now()}`,
            name,
            mealTimeEligibility: mealTimes,
            ingredients,
            recipe: instructions
        };

        const newList = [...this.recipes];
        if (this.editingRecipeIndex !== null) newList[this.editingRecipeIndex] = recipe;
        else newList.push(recipe);

        try {
            const res = await this.saveFile('recipes.json', newList, this.recipesSha, `Update: ${name}`);
            this.recipes = newList;
            this.recipesSha = res.content.sha;
            this.renderRecipes();
            this.closeModal('recipe-modal');
            this.showToast('✅ Synced to Cloud');
        } catch (e) {
            this.showToast('❌ Sync failed');
        } finally {
            this.showLoading(false);
        }
    },

    async deleteRecipe(index) {
        if (!confirm('Delete this recipe?')) return;
        this.showLoading(true);
        const newItems = [...this.recipes];
        const name = newItems[index].name;
        newItems.splice(index, 1);
        try {
            const res = await this.saveFile('recipes.json', newItems, this.recipesSha, `Delete: ${name}`);
            this.recipes = newItems;
            this.recipesSha = res.content.sha;
            this.renderRecipes();
            this.showToast('🗑️ Deleted');
        } catch (e) { this.showToast('❌ Delete failed'); }
        finally { this.showLoading(false); }
    },

    async addRecipient(e) {
        e.preventDefault();
        const email = document.getElementById('recipient-email').value.trim();
        if (!email) return;
        this.showLoading(true);
        const newList = [...this.recipients, email];
        try {
            const res = await this.saveFile('config.json', { recipients: newList }, this.configSha, `Add: ${email}`);
            this.recipients = newList;
            this.configSha = res.content.sha;
            this.renderRecipients();
            this.closeModal('recipient-modal');
            this.showToast('✅ Member added');
        } catch (e) { this.showToast('❌ Sync failed'); }
        finally { this.showLoading(false); }
    },

    async deleteRecipient(index) {
        this.showLoading(true);
        const newList = [...this.recipients];
        newList.splice(index, 1);
        try {
            const res = await this.saveFile('config.json', { recipients: newList }, this.configSha, 'Remove member');
            this.recipients = newList;
            this.configSha = res.content.sha;
            this.renderRecipients();
            this.showToast('🗑️ Removed');
        } catch (e) { this.showToast('❌ Sync failed'); }
        finally { this.showLoading(false); }
    },

    editRecipe(idx) { this.openRecipeModal(this.recipes[idx], idx); },
    openRecipeModal(recipe = null, index = null) {
        this.editingRecipeIndex = index;
        document.getElementById('recipe-modal-title').textContent = recipe ? 'Edit Recipe' : 'New Recipe';
        document.getElementById('recipe-name').value = recipe?.name || '';
        document.getElementById('recipe-ingredients').value = (recipe?.ingredients || []).join('\n');
        document.getElementById('recipe-instructions').value = recipe?.recipe || '';
        document.querySelectorAll('[name="mealTime"]').forEach(cb => {
            cb.checked = recipe?.mealTimeEligibility?.includes(cb.value) || false;
        });
        document.getElementById('recipe-modal').classList.add('active');
    },

    closeModal(id) { document.getElementById(id).classList.remove('active'); },
    showLoading(s) { document.getElementById('loading').classList.toggle('hidden', !s); },
    showToast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2500); },
    async loadWorkflowSchedule() {
        try {
            const data = await this.githubAPI('.github/workflows/daily_mailer.yml');
            if (data) {
                this.workflowSha = data.sha;
                this.workflowContent = atob(data.content);
                const cronMatch = this.workflowContent.match(/cron:\s*['"]?([^'"]+)['"]?/);
                if (cronMatch) {
                    document.getElementById('current-schedule').textContent = `Daily at ${this.formatCron(cronMatch[1])}`;
                }
            }
        } catch (e) {
            document.getElementById('current-schedule').textContent = 'Unable to load schedule';
        }
    },

    formatCron(cron) {
        try {
            const parts = cron.split(' ');
            if (parts.length < 2) return cron;

            let min = parseInt(parts[0]);
            let hour = parseInt(parts[1]);

            // Convert UTC to IST (+5:30)
            min += 30;
            if (min >= 60) {
                min -= 60;
                hour += 1;
            }
            hour += 5;
            if (hour >= 24) hour -= 24;

            const ampm = hour >= 12 ? 'PM' : 'AM';
            const h12 = hour % 12 || 12;
            const mStr = min.toString().padStart(2, '0');

            return `${h12}:${mStr} ${ampm} (IST)`;
        } catch (e) {
            return cron;
        }
    },

    async editSchedule() {
        const newTime = prompt("Set new Daily Schedule (UTC format 'm h * * *'):\n\nCommon Times (UTC):\n'0 1 * * *' = 6:30 AM IST\n'30 1 * * *' = 7:00 AM IST\n'0 2 * * *' = 7:30 AM IST", "0 1 * * *");

        if (!newTime || !newTime.includes('*')) return;

        this.showLoading(true);
        this.showToast('⚙️ Updating Schedule...');

        try {
            const newContent = this.workflowContent.replace(/cron:\s*['"]?([^'"]+)['"]?/, `cron: '${newTime}'`);
            const res = await this.saveFile('.github/workflows/daily_mailer.yml', newContent, this.workflowSha, `Update Schedule to: ${newTime}`);

            this.workflowSha = res.content.sha;
            this.workflowContent = newContent;
            document.getElementById('current-schedule').textContent = `Daily at ${this.formatCron(newTime)}`;
            this.showToast('✅ Schedule Updated!');
        } catch (e) {
            console.error('Update error:', e);
            this.showToast('❌ Update failed. Check your token scope.');
        } finally {
            this.showLoading(false);
        }
    },

    async triggerWorkflow() {
        this.showLoading(true);
        this.showToast('🚀 Dispatching Mailer...');

        try {
            // GitHub API for workflow dispatch requires repository and workflow filename
            // URL format: /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
            // Using a generic path based on our filename
            const path = `actions/workflows/daily_mailer.yml/dispatches`;
            const body = { ref: this.settings.branch };

            // Workflow dispatches is a POST to the actions API namespace
            const url = `https://api.github.com/repos/${this.settings.owner}/${this.settings.repo}/${path}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.settings.pat}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                this.showToast('✅ Mailer Triggered! Check your inbox in 2-3 mins.');
            } else {
                throw new Error('Trigger failed');
            }
        } catch (e) {
            console.error('Trigger error:', e);
            this.showToast('❌ Trigger failed. Is your token valid?');
        } finally {
            this.showLoading(false);
        }
    },

    escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; },

    showSetupModal() {
        document.getElementById('setup-modal').classList.add('active');
    },

    async handleSetup(e) {
        e.preventDefault();
        const tokenToken = document.getElementById('setup-token').value.trim();
        if (!tokenToken) return;

        this.showLoading(true);
        this.saveToken(tokenToken);

        try {
            // Test connection
            await this.loadData();
            this.closeModal('setup-modal');
            this.showToast('✅ Cloud Sync Connected!');
        } catch (e) {
            this.showToast('❌ Invalid Token or Connection failed');
            this.settings.pat = '';
            localStorage.removeItem('tyagi_meal_planner_token');
        } finally {
            this.showLoading(false);
        }
    },

    bindEvents() {
        // Refresh data
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.showToast('🔄 Syncing with Cloud...');
            this.loadData();
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Tab switching
        document.querySelectorAll('.tab').forEach(t => {
            t.addEventListener('click', () => {
                document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
                t.classList.add('active');
                document.getElementById(`${t.dataset.tab}-tab`).classList.add('active');
            });
        });
        document.getElementById('add-recipe-btn').addEventListener('click', () => this.openRecipeModal());
        document.getElementById('add-recipient-btn').addEventListener('click', () => document.getElementById('recipient-modal').classList.add('active'));
        document.getElementById('trigger-mailer-btn').addEventListener('click', () => this.triggerWorkflow());
        document.getElementById('edit-schedule-btn').addEventListener('click', () => this.editSchedule());

        document.getElementById('recipe-form').addEventListener('submit', (e) => this.saveRecipe(e));
        document.getElementById('recipient-form').addEventListener('submit', (e) => this.addRecipient(e));
        document.getElementById('setup-form').addEventListener('submit', (e) => this.handleSetup(e));
        document.getElementById('recipe-search').addEventListener('input', (e) => this.renderRecipes(e.target.value));

        // Recipe Category switching
        document.querySelectorAll('.sub-tab').forEach(st => {
            st.addEventListener('click', () => {
                document.querySelectorAll('.sub-tab').forEach(el => el.classList.remove('active'));
                st.classList.add('active');
                this.activeCategory = st.dataset.category;
                this.renderRecipes();
            });
        });

        // Settings/Edit Token trigger
        document.querySelectorAll('.edit-token-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('setup-token').value = this.settings.pat;
                this.showSetupModal();
            });
        });

        document.querySelectorAll('.close-btn, .modal').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target === el || el.classList.contains('close-btn')) {
                    const modalId = el.closest('.modal').id;
                    if (modalId === 'setup-modal' && !this.settings.pat) {
                        this.showToast('⚠️ App requires a token to function');
                        return;
                    }
                    this.closeModal(modalId);
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
