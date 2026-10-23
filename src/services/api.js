import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export const BASE_URL =
  'https://6ad71c60f71f154ac487cab2.mockapi.io';

export const DISH_URL = `${BASE_URL}/BIT240043_Dish`;
export const CATEGORY_URL = `${BASE_URL}/BIT240043_DishCategory`;

const QUEUE_KEY = 'BIT240043_PendingSync';
const LOCAL_DISH_KEY = 'BIT240043_Dish';

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// API lấy dữ liệu
export const getDishesApi = () => request(DISH_URL);
export const getCategoriesApi = () => request(CATEGORY_URL);

// API thêm, sửa, xóa món
export const createDishApi = dish =>
  request(DISH_URL, {
    method: 'POST',
    body: JSON.stringify(dish),
  });

export const updateDishApi = (id, dish) =>
  request(`${DISH_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dish),
  });

export const deleteDishApi = id =>
  request(`${DISH_URL}/${id}`, {
    method: 'DELETE',
  });

// Kiểm tra kết nối mạng
export async function isInternetAvailable() {
  if (typeof navigator !== 'undefined') {
    if (navigator.onLine === false) {
      return false;
    }
  }

  try {
    const state = await NetInfo.fetch();

    if (state.isConnected === false) {
      return false;
    }

    if (state.isInternetReachable === false) {
      return false;
    }

    return true;
  } catch {
    return typeof navigator !== 'undefined'
      ? navigator.onLine !== false
      : false;
  }
}

// Đọc hàng đợi đồng bộ
export async function getPendingSync() {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

async function saveQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Thêm công việc vào hàng đợi
export async function addPendingSync(type, payload) {
  const queue = await getPendingSync();
  const id = payload?.id;

  if (id != null && String(id).startsWith('local_')) {
    const index = queue.findIndex(
      item => String(item.payload?.id) === String(id)
    );

    if (index >= 0) {
      const old = queue[index];

      if (old.type === 'CREATE' && type === 'DELETE') {
        queue.splice(index, 1);
        await saveQueue(queue);
        return;
      }

      if (old.type === 'CREATE' || type === 'UPDATE') {
        queue[index] = {
          ...old,
          type: old.type === 'CREATE' ? 'CREATE' : type,
          payload: {
            ...old.payload,
            ...payload,
          },
        };

        await saveQueue(queue);
        return;
      }
    }
  }

  queue.push({
    syncId: `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    type,
    payload,
  });

  await saveQueue(queue);
}

let syncing = false;

// Đồng bộ hàng đợi khi có mạng
export async function syncPendingData() {
  if (syncing) {
    return;
  }

  const online = await isInternetAvailable();

  if (!online) {
    console.log('Đang ngoại tuyến, giữ dữ liệu chờ đồng bộ.');
    return;
  }

  syncing = true;

  try {
    let queue = await getPendingSync();

    while (queue.length > 0) {
      // Kiểm tra mạng lại trước từng công việc
      const stillOnline = await isInternetAvailable();

      if (!stillOnline) {
        break;
      }

      const action = queue[0];

      try {
        if (action.type === 'CREATE') {
          const { id: localId, ...createPayload } =
            action.payload || {};

          // Tìm bản ghi đã được tạo trước đó bằng mã local
          const remoteDishes = await getDishesApi();

          let created = Array.isArray(remoteDishes)
            ? remoteDishes.find(
                dish =>
                  String(dish.BIT240043_LocalId ?? '') ===
                  String(localId)
              )
            : null;

          // Chưa có trên server thì mới tạo
          if (!created) {
            created = await createDishApi({
              ...createPayload,
              BIT240043_LocalId: localId,
            });
          }

          // Thay món local bằng bản ghi server
          const localDishes = JSON.parse(
            (await AsyncStorage.getItem(LOCAL_DISH_KEY)) || '[]'
          );

          const existsOnLocal = localDishes.some(
            dish => String(dish.id) === String(localId)
          );

          const updatedDishes = existsOnLocal
            ? localDishes.map(dish =>
                String(dish.id) === String(localId)
                  ? {
                      ...created,
                      BIT240043_LocalId: localId,
                    }
                  : dish
              )
            : localDishes;

          await AsyncStorage.setItem(
            LOCAL_DISH_KEY,
            JSON.stringify(updatedDishes)
          );
        } else if (action.type === 'UPDATE') {
          await updateDishApi(
            action.payload.id,
            action.payload
          );
        } else if (action.type === 'DELETE') {
          await deleteDishApi(
            action.payload?.id ?? action.payload
          );
        }

        // Chỉ xóa công việc khỏi hàng đợi sau khi thành công
        queue.shift();
        await saveQueue(queue);
      } catch (error) {
        console.log(
          'Đồng bộ chưa thành công:',
          error.message
        );
        break;
      }
    }
  } finally {
    syncing = false;
  }
}

// Tự đồng bộ khi mạng được bật lại trên trình duyệt
let onlineListenerRegistered = false;

if (
  typeof window !== 'undefined' &&
  !onlineListenerRegistered
) {
  onlineListenerRegistered = true;

  window.addEventListener('online', () => {
    syncPendingData().catch(error => {
      console.log('Lỗi đồng bộ khi có mạng:', error.message);
    });
  });

  window.addEventListener('offline', () => {
    console.log('Trình duyệt đang ngoại tuyến.');
  });
}

// Theo dõi kết nối của React Native
NetInfo.addEventListener(state => {
  if (
    state.isConnected === true &&
    state.isInternetReachable !== false
  ) {
    syncPendingData().catch(error => {
      console.log('Lỗi đồng bộ:', error.message);
    });
  }
});
