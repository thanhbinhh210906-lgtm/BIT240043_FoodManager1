// src/models/models.js
// XÓA HOÀN TOÀN CÁC DÒNG IMPORT TRONG FILE NÀY

export const STORAGE_KEYS = {
  CATEGORY: 'BIT240043_DishCategory',
  DISH: 'BIT240043_Dish',
  IMAGE: 'BIT240043_DishImage',
  PENDING_SYNC: 'BIT240043_PendingSync',
  LANGUAGE: 'BIT240043_Language',
  SEEDED: 'BIT240043_Seeded',
};

export const FIELD_PREFIX = 'BIT240043_';
export const f = (name) => `${FIELD_PREFIX}${name}`;