"""
Recipe Database
A curated list of popular recipes across cuisines.
Each recipe lists its core ingredients — these are matched
against the user's live kitchen inventory.
"""

RECIPE_DB = [
    # ── Indian ──────────────────────────────────────────────────────────────
    {
        "name": "Aloo Dum",
        "cuisine": "Indian",
        "ingredients": ["potato", "onion", "tomato", "ginger", "garlic",
                        "turmeric", "red chilli powder", "garam masala", "mustard oil"],
    },
    {
        "name": "Dal Tadka",
        "cuisine": "Indian",
        "ingredients": ["dal", "onion", "tomato", "garlic", "ginger",
                        "cumin", "turmeric", "red chilli powder", "mustard oil"],
    },
    {
        "name": "Egg Curry",
        "cuisine": "Indian",
        "ingredients": ["eggs", "onion", "tomato", "garlic", "ginger",
                        "turmeric", "garam masala", "mustard oil"],
    },
    {
        "name": "Paneer Butter Masala",
        "cuisine": "Indian",
        "ingredients": ["paneer", "onion", "tomato", "garlic", "ginger",
                        "butter", "cream", "garam masala"],
    },
    {
        "name": "Aloo Paratha",
        "cuisine": "Indian",
        "ingredients": ["potato", "wheat flour", "onion", "ginger",
                        "coriander leaves", "green chilli", "butter"],
    },
    {
        "name": "Chicken Curry",
        "cuisine": "Indian",
        "ingredients": ["chicken", "onion", "tomato", "garlic", "ginger",
                        "turmeric", "garam masala", "mustard oil"],
    },
    {
        "name": "Vegetable Biryani",
        "cuisine": "Indian",
        "ingredients": ["rice", "onion", "tomato", "carrot", "peas",
                        "garlic", "ginger", "garam masala", "ghee"],
    },
    {
        "name": "Palak Paneer",
        "cuisine": "Indian",
        "ingredients": ["spinach", "paneer", "onion", "garlic", "ginger",
                        "tomato", "cream", "garam masala"],
    },
    {
        "name": "Masoor Dal",
        "cuisine": "Indian",
        "ingredients": ["lentils", "onion", "tomato", "garlic",
                        "turmeric", "cumin", "mustard oil"],
    },
    {
        "name": "Aloo Gobhi",
        "cuisine": "Indian",
        "ingredients": ["potato", "cauliflower", "onion", "tomato",
                        "garlic", "ginger", "turmeric", "mustard oil"],
    },
    {
        "name": "Egg Bhurji",
        "cuisine": "Indian",
        "ingredients": ["eggs", "onion", "tomato", "green chilli",
                        "coriander leaves", "mustard oil", "turmeric"],
    },
    {
        "name": "Chana Masala",
        "cuisine": "Indian",
        "ingredients": ["chickpeas", "onion", "tomato", "garlic", "ginger",
                        "garam masala", "cumin", "mustard oil"],
    },
    {
        "name": "Poha",
        "cuisine": "Indian",
        "ingredients": ["poha", "onion", "potato", "mustard oil",
                        "turmeric", "coriander leaves", "lemon"],
    },

    # ── Bengali ─────────────────────────────────────────────────────────────
    {
        "name": "Aloo Posto",
        "cuisine": "Bengali",
        "ingredients": ["potato", "mustard oil", "green chilli", "turmeric"],
    },
    {
        "name": "Shorshe Ilish",
        "cuisine": "Bengali",
        "ingredients": ["hilsa fish", "mustard oil", "green chilli", "turmeric"],
    },
    {
        "name": "Begun Bhaja",
        "cuisine": "Bengali",
        "ingredients": ["brinjal", "mustard oil", "turmeric", "red chilli powder"],
    },

    # ── Chinese ─────────────────────────────────────────────────────────────
    {
        "name": "Egg Fried Rice",
        "cuisine": "Chinese",
        "ingredients": ["rice", "eggs", "onion", "garlic", "carrot",
                        "capsicum", "soy sauce"],
    },
    {
        "name": "Vegetable Noodles",
        "cuisine": "Chinese",
        "ingredients": ["noodles", "onion", "carrot", "capsicum",
                        "garlic", "soy sauce"],
    },
    {
        "name": "Manchurian",
        "cuisine": "Chinese",
        "ingredients": ["onion", "garlic", "ginger", "capsicum",
                        "carrot", "wheat flour"],
    },

    # ── Italian ─────────────────────────────────────────────────────────────
    {
        "name": "Pasta Aglio e Olio",
        "cuisine": "Italian",
        "ingredients": ["pasta", "garlic", "olive oil", "black pepper"],
    },
    {
        "name": "Tomato Bruschetta",
        "cuisine": "Italian",
        "ingredients": ["tomato", "garlic", "olive oil", "bread"],
    },

    # ── Continental / Breakfast ─────────────────────────────────────────────
    {
        "name": "Masala Omelette",
        "cuisine": "Continental",
        "ingredients": ["eggs", "onion", "tomato", "green chilli",
                        "coriander leaves", "butter"],
    },
    {
        "name": "French Toast",
        "cuisine": "Continental",
        "ingredients": ["bread", "eggs", "milk", "sugar", "butter"],
    },
    {
        "name": "Banana Smoothie",
        "cuisine": "Continental",
        "ingredients": ["banana", "milk", "sugar"],
    },
]
