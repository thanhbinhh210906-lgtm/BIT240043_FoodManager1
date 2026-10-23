import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {
  getDishesApi,
  getCategoriesApi,
  addPendingSync,
  syncPendingData,
  isInternetAvailable,
} from '../services/api';

export const AppContext = createContext();

const KEYS = {
  dishes: 'BIT240043_Dish',
  categories: 'BIT240043_DishCategory',
  language: 'BIT240043_lang',
};

const normalize = dish => ({
  ...dish,
  price: Number(dish?.price) || 0,
  cookingTime: Number(dish?.cookingTime) || 0,
  available: dish?.available !== false,
  images: Array.isArray(dish?.images) ? dish.images : [],
});

const read = async key => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.log('Lỗi đọc dữ liệu:', error.message);
    return [];
  }
};

const write = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const AppProvider = ({ children }) => {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [language, setLanguage] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);

  const persistDishes = useCallback(async list => {
    const normalized = list.map(normalize);
    await write(KEYS.dishes, normalized);
    setDishes(normalized);
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.onLine === false
      ) {
        setOnline(false);
        return false;
      }

      const connected = await isInternetAvailable();
      setOnline(connected);
      return connected;
    } catch (error) {
      setOnline(false);
      console.log('Lỗi kiểm tra mạng:', error.message);
      return false;
    }
  }, []);

  const loadData = useCallback(async () => {
    const localDishes = (await read(KEYS.dishes)).map(normalize);
    const localCategories = await read(KEYS.categories);
    const savedLanguage = await AsyncStorage.getItem(KEYS.language);

    setDishes(localDishes);
    setCategories(localCategories);

    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    if (!(await checkConnection())) {
      return;
    }

    setLoading(true);

    try {
      await syncPendingData();

      const [remoteDishes, remoteCategories] = await Promise.all([
        getDishesApi(),
        getCategoriesApi(),
      ]);

      if (Array.isArray(remoteDishes)) {
        const latestLocal = (await read(KEYS.dishes)).map(normalize);
        const localOnly = latestLocal.filter(dish =>
          String(dish.id).startsWith('local_')
        );

        const merged = [
          ...localOnly.filter(local =>
            !remoteDishes.some(
              remote =>
                String(remote.BIT240043_LocalId || '') ===
                String(local.id)
            )
          ),
          ...remoteDishes.map(normalize),
        ];

        await persistDishes(merged);
      }

      if (Array.isArray(remoteCategories)) {
        setCategories(remoteCategories);
        await write(KEYS.categories, remoteCategories);
      }

      setOnline(true);
    } catch (error) {
      console.log('Lỗi tải dữ liệu:', error.message);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [checkConnection, persistDishes]);

  useEffect(() => {
    let mounted = true;
    let checking = false;

    const refresh = async () => {
      if (!mounted || checking) return;

      checking = true;

      try {
        await loadData();
      } finally {
        checking = false;
      }
    };

    refresh();

    const unsubscribe = NetInfo.addEventListener(state => {
      if (Platform.OS !== 'web' && state.isConnected === false) {
        setOnline(false);
      } else {
        refresh();
      }
    });

    const handleOnline = () => refresh();
    const handleOffline = () => setOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      mounted = false;
      unsubscribe();

      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [loadData]);

  const addDish = async data => {
    const randomId = Math.random().toString(36).slice(2, 7);

    const local = normalize({
      ...data,
      id: 'local_' + Date.now() + '_' + randomId,
    });

    const current = await read(KEYS.dishes);

    await persistDishes([local, ...current]);
    await addPendingSync('CREATE', local);

    try {
      if (await checkConnection()) {
        await syncPendingData();
        await loadData();
      }
    } catch (error) {
      console.log('Món đã lưu trên máy, sẽ đồng bộ sau:', error.message);
    }

    return local;
  };

  const editDish = async (id, data) => {
    const current = await read(KEYS.dishes);

    const existing = current.find(
      dish => String(dish.id) === String(id)
    );

    if (!existing) return;

    const updated = normalize({
      ...existing,
      ...data,
      id: existing.id,
    });

    const updatedList = current.map(dish =>
      String(dish.id) === String(id) ? updated : dish
    );

    await persistDishes(updatedList);

    await addPendingSync(
      String(id).startsWith('local_') ? 'CREATE' : 'UPDATE',
      updated
    );

    try {
      if (await checkConnection()) {
        await syncPendingData();
        await loadData();
      }
    } catch (error) {
      console.log('Món đã lưu trên máy, sẽ đồng bộ sau:', error.message);
    }
  };

  const removeDish = async id => {
    const current = await read(KEYS.dishes);

    const updatedList = current.filter(
      dish => String(dish.id) !== String(id)
    );

    await persistDishes(updatedList);
    await addPendingSync('DELETE', { id });

    try {
      if (await checkConnection()) {
        await syncPendingData();
        await loadData();
      }
    } catch (error) {
      console.log('Món đã xóa trên máy, sẽ đồng bộ sau:', error.message);
    }
  };

  const saveCategories = async list => {
    const safeList = Array.isArray(list) ? list : [];
    setCategories(safeList);
    await write(KEYS.categories, safeList);
  };

  const changeLanguage = async value => {
    setLanguage(value);
    await AsyncStorage.setItem(KEYS.language, value);
  };

  const value = {
    dishes,
    setDishes,
    categories,
    setCategories,
    language,
    lang: language,
    setLanguage,
    changeLanguage,
    changeLang: changeLanguage,
    online,
    loading,
    setLoading,
    loadData,
    addDish,
    editDish,
    removeDish,
    deleteDish: removeDish,
    saveCategories,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
