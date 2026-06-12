import axios from "axios";

const api = axios.create({ baseURL: "https://kitchen-ai-production-2814.up.railway.app/api/v1" });

export const transcribeAudio = async (file) => {
  const form = new FormData();
  form.append("audio_file", file);
  const { data } = await api.post("/transcribe", form);
  return data;
};

export const compareprices = async (groceryList) => {
  const { data } = await api.post("/price-compare", { grocery_list: groceryList });
  return data;
};

export const getInventory = async () => {
  const { data } = await api.get("/inventory");
  return data;
};

export const addInventoryBulk = async (items) => {
  const { data } = await api.post("/inventory/add-bulk", { items });
  return data;
};

export const removeInventoryItem = async (itemName) => {
  const { data } = await api.delete("/inventory/remove", {
    data: { item: itemName },
  });
  return data;
};

export const getRecipes = async (cuisine = null, max = 6) => {
  const params = { max_recipes: max };
  if (cuisine) params.cuisine = cuisine;
  const { data } = await api.get("/recipes", { params });
  return data;
};

export const getPendingOrder = async () => {
  const { data } = await api.get("/webhook/pending-order");
  return data;
};

export const confirmPurchase = async (orderId) => {
  const { data } = await api.post(`/webhook/confirm-purchase/${orderId}`);
  return data;
};
