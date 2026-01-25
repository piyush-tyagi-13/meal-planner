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
        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
            sha
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
        } catch (e) {
            console.error('Load error:', e);
            this.showToast('⚠️ Data sync failed');
        } finally {
            this.showLoading(false);
        }
    },

    renderRecipes(filter = '') {
        const list = document.getElementById('recipes-list');
        const searchTerm = filter.toLowerCase();

        const filtered = this.recipes.filter(r =>
            r.name.toLowerCase().includes(searchTerm) ||
            r.ingredients?.some(i => i.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><span>🍱</span><p>No recipes found</p></div>`;
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
        document.getElementById('recipe-form').addEventListener('submit', (e) => this.saveRecipe(e));
        document.getElementById('recipient-form').addEventListener('submit', (e) => this.addRecipient(e));
        document.getElementById('setup-form').addEventListener('submit', (e) => this.handleSetup(e));
        document.getElementById('recipe-search').addEventListener('input', (e) => this.renderRecipes(e.target.value));

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
