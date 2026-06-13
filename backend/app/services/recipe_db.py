"""
Recipe Database with veg/non-veg tags.
"""

RECIPE_DB = [
    # ── Indian Veg ───────────────────────────────────────────────────────────
    {"name": "Aloo Dum",          "cuisine": "Indian",      "veg": True,  "ingredients": ["potato","onion","tomato","ginger","garlic","turmeric","red chilli powder","garam masala","mustard oil"]},
    {"name": "Dal Tadka",         "cuisine": "Indian",      "veg": True,  "ingredients": ["dal","onion","tomato","garlic","ginger","cumin","turmeric","red chilli powder","mustard oil"]},
    {"name": "Aloo Paratha",      "cuisine": "Indian",      "veg": True,  "ingredients": ["potato","wheat flour","onion","ginger","coriander leaves","green chilli","butter"]},
    {"name": "Paneer Butter Masala","cuisine":"Indian",     "veg": True,  "ingredients": ["paneer","onion","tomato","garlic","ginger","butter","cream","garam masala"]},
    {"name": "Aloo Gobhi",        "cuisine": "Indian",      "veg": True,  "ingredients": ["potato","cauliflower","onion","tomato","garlic","ginger","turmeric","mustard oil"]},
    {"name": "Chana Masala",      "cuisine": "Indian",      "veg": True,  "ingredients": ["chickpeas","onion","tomato","garlic","ginger","garam masala","cumin","mustard oil"]},
    {"name": "Palak Paneer",      "cuisine": "Indian",      "veg": True,  "ingredients": ["spinach","paneer","onion","garlic","ginger","tomato","cream","garam masala"]},
    {"name": "Masoor Dal",        "cuisine": "Indian",      "veg": True,  "ingredients": ["lentils","onion","tomato","garlic","turmeric","cumin","mustard oil"]},
    {"name": "Poha",              "cuisine": "Indian",      "veg": True,  "ingredients": ["poha","onion","potato","mustard oil","turmeric","coriander leaves","lemon"]},
    {"name": "Vegetable Biryani", "cuisine": "Indian",      "veg": True,  "ingredients": ["rice","onion","tomato","carrot","peas","garlic","ginger","garam masala","ghee"]},
    # ── Indian Non-Veg ───────────────────────────────────────────────────────
    {"name": "Egg Curry",         "cuisine": "Indian",      "veg": False, "ingredients": ["eggs","onion","tomato","garlic","ginger","turmeric","garam masala","mustard oil"]},
    {"name": "Egg Bhurji",        "cuisine": "Indian",      "veg": False, "ingredients": ["eggs","onion","tomato","green chilli","coriander leaves","mustard oil","turmeric"]},
    {"name": "Chicken Curry",     "cuisine": "Indian",      "veg": False, "ingredients": ["chicken","onion","tomato","garlic","ginger","turmeric","garam masala","mustard oil"]},
    {"name": "Masala Omelette",   "cuisine": "Continental", "veg": False, "ingredients": ["eggs","onion","tomato","green chilli","coriander leaves","butter"]},
    # ── Bengali ──────────────────────────────────────────────────────────────
    {"name": "Aloo Posto",        "cuisine": "Bengali",     "veg": True,  "ingredients": ["potato","mustard oil","green chilli","turmeric"]},
    {"name": "Begun Bhaja",       "cuisine": "Bengali",     "veg": True,  "ingredients": ["brinjal","mustard oil","turmeric","red chilli powder"]},
    {"name": "Shorshe Ilish",     "cuisine": "Bengali",     "veg": False, "ingredients": ["hilsa fish","mustard oil","green chilli","turmeric"]},
    # ── Chinese ──────────────────────────────────────────────────────────────
    {"name": "Egg Fried Rice",    "cuisine": "Chinese",     "veg": False, "ingredients": ["rice","eggs","onion","garlic","carrot","capsicum","soy sauce"]},
    {"name": "Vegetable Noodles", "cuisine": "Chinese",     "veg": True,  "ingredients": ["noodles","onion","carrot","capsicum","garlic","soy sauce"]},
    {"name": "Manchurian",        "cuisine": "Chinese",     "veg": True,  "ingredients": ["onion","garlic","ginger","capsicum","carrot","wheat flour"]},
    # ── Italian ──────────────────────────────────────────────────────────────
    {"name": "Pasta Aglio e Olio","cuisine": "Italian",     "veg": True,  "ingredients": ["pasta","garlic","olive oil","black pepper"]},
    {"name": "Tomato Bruschetta", "cuisine": "Italian",     "veg": True,  "ingredients": ["tomato","garlic","olive oil","bread"]},
    # ── Continental ──────────────────────────────────────────────────────────
    {"name": "French Toast",      "cuisine": "Continental", "veg": False, "ingredients": ["bread","eggs","milk","sugar","butter"]},
    {"name": "Banana Smoothie",   "cuisine": "Continental", "veg": True,  "ingredients": ["banana","milk","sugar"]},
]
