import json
import ttkbootstrap as tb
from ttkbootstrap.constants import *
from tkinter import filedialog, messagebox
from tkinter import StringVar, Toplevel, Text

class RecipeManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title('Recipe Manager (Modern)')
        self.recipes = []
        self.filename = None

        # Toolbar
        toolbar = tb.Frame(root)
        toolbar.pack(fill='x', padx=10, pady=5)
        tb.Button(toolbar, text='Import JSON', bootstyle=SECONDARY, command=self.import_json).pack(side='left', padx=2)
        tb.Button(toolbar, text='Export JSON', bootstyle=SECONDARY, command=self.export_json).pack(side='left', padx=2)
        tb.Button(toolbar, text='Add', bootstyle=SUCCESS, command=self.add_recipe).pack(side='left', padx=2)
        tb.Button(toolbar, text='Edit', bootstyle=WARNING, command=self.edit_recipe).pack(side='left', padx=2)
        tb.Button(toolbar, text='Delete', bootstyle=DANGER, command=self.delete_recipe).pack(side='left', padx=2)

        # Table
        columns = ('name', 'mealTimeEligibility', 'ingredients')
        self.tree = tb.Treeview(root, columns=columns, show='headings', height=20, bootstyle=INFO)
        self.tree.heading('name', text='Name', anchor='w')
        self.tree.heading('mealTimeEligibility', text='Meal Times', anchor='w')
        self.tree.heading('ingredients', text='Ingredients', anchor='w')
        self.tree.column('name', width=200)
        self.tree.column('mealTimeEligibility', width=120)
        self.tree.column('ingredients', width=300)
        self.tree.pack(fill='both', expand=True, padx=10, pady=5)
        self.tree.bind('<Double-1>', self.on_double_click)

        # Scrollbar
        vsb = tb.Scrollbar(self.tree, orient='vertical', command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side='right', fill='y')

    def refresh_table(self):
        self.tree.delete(*self.tree.get_children())
        for idx, r in enumerate(self.recipes):
            self.tree.insert('', 'end', iid=idx, values=(
                r['name'],
                ', '.join(r.get('mealTimeEligibility', [])),
                ', '.join(r.get('ingredients', []))
            ))

    def import_json(self):
        file = filedialog.askopenfilename(filetypes=[('JSON Files', '*.json')])
        if file:
            with open(file, encoding='utf-8') as f:
                self.recipes = json.load(f)
                self.filename = file
            self.refresh_table()

    def export_json(self):
        file = filedialog.asksaveasfilename(defaultextension='.json', filetypes=[('JSON Files', '*.json')])
        if file:
            with open(file, 'w', encoding='utf-8') as f:
                json.dump(self.recipes, f, indent=2, ensure_ascii=False)
            messagebox.showinfo('Exported', 'Recipes exported!')

    def add_recipe(self):
        data = self.recipe_form()
        if data:
            self.recipes.append(data)
            self.refresh_table()

    def edit_recipe(self):
        idx = self.get_selected_index()
        if idx is not None:
            data = self.recipe_form(self.recipes[idx])
            if data:
                self.recipes[idx] = data
                self.refresh_table()

    def delete_recipe(self):
        idx = self.get_selected_index()
        if idx is not None:
            if messagebox.askyesno('Delete', f"Delete recipe '{self.recipes[idx]['name']}'?"):
                del self.recipes[idx]
                self.refresh_table()

    def get_selected_index(self):
        sel = self.tree.selection()
        if sel:
            return int(sel[0])
        return None

    def on_double_click(self, event):
        self.edit_recipe()

    def recipe_form(self, recipe=None):
        form = Toplevel(self.root)
        form.title('Recipe')
        form.grab_set()
        result = {}
        # Name
        tb.Label(form, text='Name').grid(row=0, column=0, sticky='w')
        name_var = StringVar(value=recipe['name'] if recipe else '')
        tb.Entry(form, textvariable=name_var, width=40).grid(row=0, column=1)
        # Meal Time Eligibility
        tb.Label(form, text='Meal Time Eligibility (comma separated)').grid(row=1, column=0, sticky='w')
        meal_var = StringVar(value=','.join(recipe.get('mealTimeEligibility', [])) if recipe else '')
        tb.Entry(form, textvariable=meal_var, width=40).grid(row=1, column=1)
        # Ingredients
        tb.Label(form, text='Ingredients (one per line)').grid(row=2, column=0, sticky='nw')
        ing_text = Text(form, width=40, height=5)
        ing_text.grid(row=2, column=1)
        if recipe:
            ing_text.insert('1.0', '\n'.join(recipe.get('ingredients', [])))
        # Instructions
        tb.Label(form, text='Instructions').grid(row=3, column=0, sticky='nw')
        inst_text = Text(form, width=40, height=5)
        inst_text.grid(row=3, column=1)
        if recipe:
            inst_text.insert('1.0', recipe.get('instructions', ''))
        # Buttons
        def on_save():
            result['name'] = name_var.get().strip()
            result['mealTimeEligibility'] = [x.strip() for x in meal_var.get().split(',') if x.strip()]
            result['ingredients'] = [x.strip() for x in ing_text.get('1.0', 'end').split('\n') if x.strip()]
            result['instructions'] = inst_text.get('1.0', 'end').strip()
            form.destroy()
        def on_cancel():
            result.clear()
            form.destroy()
        btn_frame = tb.Frame(form)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=5)
        tb.Button(btn_frame, text='Save', bootstyle=SUCCESS, command=on_save).pack(side='left', padx=5)
        tb.Button(btn_frame, text='Cancel', bootstyle=SECONDARY, command=on_cancel).pack(side='left', padx=5)
        form.wait_window()
        return result if result else None

def main():
    app = tb.Window(themename='flatly')
    RecipeManagerApp(app)
    app.mainloop()

if __name__ == '__main__':
    main()
