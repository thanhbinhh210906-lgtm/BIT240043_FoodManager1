// MSSV: BIT240043
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, f } from '../models/models';

async function readList(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.log('readList error', key, e);
    return [];
  }
}

async function writeList(key, list) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

export async function getCategories() { return readList(STORAGE_KEYS.CATEGORY); }
export async function saveCategories(list) { return writeList(STORAGE_KEYS.CATEGORY, list); }
export async function getDishes() { return readList(STORAGE_KEYS.DISH); }
export async function saveDishes(list) { return writeList(STORAGE_KEYS.DISH, list); }
export async function getImages() { return readList(STORAGE_KEYS.IMAGE); }
export async function saveImages(list) { return writeList(STORAGE_KEYS.IMAGE, list); }

export async function seedIfNeeded() {
  const seeded = await AsyncStorage.getItem(STORAGE_KEYS.SEEDED);
  if (seeded === 'true') return;

  const categories = [
    { [f('DishCategoryId')]: 1, [f('Name')]: 'Main Course', [f('Description')]: 'Món chính' },
    { [f('DishCategoryId')]: 2, [f('Name')]: 'Drink',       [f('Description')]: 'Đồ uống' },
    { [f('DishCategoryId')]: 3, [f('Name')]: 'Dessert',     [f('Description')]: 'Tráng miệng' },
  ];

  const dishes = [
    { [f('DishId')]: 1, [f('Name')]: 'Pho Bo', [f('Price')]: 50000, [f('PreparationTime')]: 20, [f('IsAvailable')]: true, [f('Description')]: 'Phở bò Hà Nội', [f('DishCategoryId')]: 1 },
    { [f('DishId')]: 2, [f('Name')]: 'Banh Mi', [f('Price')]: 20000, [f('PreparationTime')]: 5, [f('IsAvailable')]: true, [f('Description')]: 'Bánh mì thịt', [f('DishCategoryId')]: 1 },
    { [f('DishId')]: 3, [f('Name')]: 'Tra Da', [f('Price')]: 5000, [f('PreparationTime')]: 2, [f('IsAvailable')]: true, [f('Description')]: 'Trà đá', [f('DishCategoryId')]: 2 },
    { [f('DishId')]: 4, [f('Name')]: 'Che Ba Mau', [f('Price')]: 15000, [f('PreparationTime')]: 10, [f('IsAvailable')]: false, [f('Description')]: 'Chè ba màu', [f('DishCategoryId')]: 3 },
    { [f('DishId')]: 5, [f('Name')]: 'Com Tam', [f('Price')]: 45000, [f('PreparationTime')]: 25, [f('IsAvailable')]: true, [f('Description')]: 'Cơm tấm sườn', [f('DishCategoryId')]: 1 },
  ];

  const images = [
    { [f('ImageId')]: 1, [f('ImageUrl')]: 'https://picsum.photos/seed/pho/400/300',  [f('IsThumbnail')]: true,  [f('DishId')]: 1 },
    { [f('ImageId')]: 2, [f('ImageUrl')]: 'https://picsum.photos/seed/pho2/400/300', [f('IsThumbnail')]: false, [f('DishId')]: 1 },
    { [f('ImageId')]: 3, [f('ImageUrl')]: 'https://picsum.photos/seed/bm/400/300',   [f('IsThumbnail')]: true,  [f('DishId')]: 2 },
    { [f('ImageId')]: 4, [f('ImageUrl')]: 'https://picsum.photos/seed/tra/400/300',  [f('IsThumbnail')]: true,  [f('DishId')]: 3 },
    { [f('ImageId')]: 5, [f('ImageUrl')]: 'https://picsum.photos/seed/com/400/300',  [f('IsThumbnail')]: true,  [f('DishId')]: 5 },
  ];

  await saveCategories(categories);
  await saveDishes(dishes);
  await saveImages(images);
  await AsyncStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
}

export async function nextId(key, idField) {
  const list = await readList(key);
  if (list.length === 0) return 1;
  return Math.max(...list.map((x) => x[idField] || 0)) + 1;
}

export async function getLanguage() {
  return (await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE)) || 'en';
}
export async function saveLanguage(lang) {
  await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
}
// --- Thêm phần xử lý Hàng đợi Đồng bộ (Offline Sync) ---
export async function addPendingSync(action, payload) {
  const queue = await readList(STORAGE_KEYS.PENDING_SYNC);
  queue.push({ id: Date.now(), action, payload });
  await writeList(STORAGE_KEYS.PENDING_SYNC, queue);
}

export async function getPendingSync() {
  return readList(STORAGE_KEYS.PENDING_SYNC);
}

export async function clearPendingSync() {
  await writeList(STORAGE_KEYS.PENDING_SYNC, []);
}

// --- Ràng buộc: Không xóa Category đang có Dish ---
export async function deleteCategorySafe(catId) {
  const dishes = await getDishes();
  const isUsed = dishes.some(d => d[f('DishCategoryId')] === catId);
  if (isUsed) {
    throw new Error('CATEGORY_IN_USE'); // Ném lỗi để UI bắt
  }
  const cats = await getCategories();
  const updated = cats.filter(c => c[f('DishCategoryId')] !== catId);
  await saveCategories(updated);
  return true;
}