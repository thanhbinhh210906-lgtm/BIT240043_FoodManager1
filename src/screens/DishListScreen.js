
// MSSV: BIT240043
import React, {
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../context/AppContext';
import { t } from '../i18n';

const F = name => 'BIT240043_' + name;

const catId = c =>
  String(c?.id ?? c?.[F('DishCategoryId')] ?? '');

const catName = c =>
  c?.[F('Name')] ?? c?.name ?? '';

const money = n =>
  `${Number(n || 0).toLocaleString('vi-VN')} ₫`;

export default function DishListScreen({ navigation }) {
  const {
    dishes = [],
    categories = [],
    lang,
    changeLang,
    loadData,
    removeDish,
    loading,
  } = useContext(AppContext);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [available, setAvailable] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('none');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const tr = (en, vi) => (lang === 'en' ? en : vi);

  useFocusEffect(
    useCallback(() => {
      loadData?.();
    }, [loadData])
  );

  const filtered = useMemo(() => {
    let rows = (Array.isArray(dishes) ? dishes : []).filter(
      d => d && d.id != null && d[F('Name')]
    );

    rows = rows.filter(d =>
      String(d[F('Name')])
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );

    if (category !== 'all') {
      rows = rows.filter(
        d => String(d[F('DishCategoryId')]) === category
      );
    }

    if (available === 'yes') {
      rows = rows.filter(d => d[F('IsAvailable')] === true);
    }

    if (available === 'no') {
      rows = rows.filter(d => d[F('IsAvailable')] !== true);
    }

    if (minPrice.trim() !== '' && Number.isFinite(Number(minPrice))) {
      rows = rows.filter(
        d => Number(d[F('Price')]) >= Number(minPrice)
      );
    }

    if (maxPrice.trim() !== '' && Number.isFinite(Number(maxPrice))) {
      rows = rows.filter(
        d => Number(d[F('Price')]) <= Number(maxPrice)
      );
    }

    if (sort === 'asc') {
      rows.sort(
        (a, b) => Number(a[F('Price')]) - Number(b[F('Price')])
      );
    } else if (sort === 'desc') {
      rows.sort(
        (a, b) => Number(b[F('Price')]) - Number(a[F('Price')])
      );
    } else if (sort === 'time') {
      rows.sort(
        (a, b) =>
          Number(a[F('PreparationTime')]) -
          Number(b[F('PreparationTime')])
      );
    }

    return rows;
  }, [
    dishes,
    search,
    category,
    available,
    minPrice,
    maxPrice,
    sort,
  ]);

  const performDelete = useCallback(
    async item => {
      if (deletingId !== null) return;

      setDeletingId(item.id);

      try {
        if (typeof removeDish !== 'function') {
          throw new Error('removeDish is not available in AppContext');
        }

        await removeDish(item.id);
        await loadData?.();
      } catch (error) {
        console.error('Delete dish error:', error);

        const message = tr(
          'Unable to delete this dish. Please try again.',
          'Không thể xóa món ăn. Vui lòng thử lại.'
        );

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert(tr('Error', 'Lỗi'), message);
        }
      } finally {
        setDeletingId(null);
      }
    },
    [removeDish, loadData, deletingId, lang]
  );

  const askDelete = useCallback(
    item => {
      const title = tr('Confirm deletion', 'Xác nhận xóa');
      const message = tr(
        `Are you sure you want to delete "${item[F('Name')]}"?`,
        `Bạn có chắc chắn muốn xóa món "${item[F('Name')]}" không?`
      );

      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return;

        const confirmed = window.confirm(`${title}\n\n${message}`);

        if (confirmed) {
          performDelete(item);
        }

        return;
      }

      Alert.alert(
        title,
        message,
        [
          {
            text: tr('Cancel', 'Hủy'),
            style: 'cancel',
          },
          {
            text: tr('Delete', 'Xóa'),
            style: 'destructive',
            onPress: () => performDelete(item),
          },
        ],
        { cancelable: true }
      );
    },
    [lang, performDelete]
  );

  const reset = () => {
    setSearch('');
    setCategory('all');
    setAvailable('all');
    setMinPrice('');
    setMaxPrice('');
    setSort('none');
  };

  const renderDish = ({ item }) => {
    const imgs = Array.isArray(item[F('DishImage')])
      ? item[F('DishImage')]
      : [];

    const thumb =
      imgs.find(x => x?.[F('IsThumbnail')]) || imgs[0];

    const cat = (Array.isArray(categories) ? categories : []).find(
      c => catId(c) === String(item[F('DishCategoryId')])
    );

    const quick = Number(item[F('PreparationTime')]) <= 15;
    const isDeleting = deletingId === item.id;

    return (
      <View style={s.card}>
        <TouchableOpacity
          style={s.dishContent}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Detail', {
              dishId: item.id,
            })
          }
        >
          {thumb?.[F('ImageUrl')] ? (
            <Image
              source={{ uri: thumb[F('ImageUrl')] }}
              style={s.photo}
            />
          ) : (
            <View style={[s.photo, s.photoEmpty]}>
              <Text style={{ fontSize: 28 }}>🍽</Text>
            </View>
          )}

          <View style={s.cardBody}>
            <View style={s.nameRow}>
              <Text style={s.dishName} numberOfLines={2}>
                {item[F('Name')]}
              </Text>

              <View
                style={[
                  s.pill,
                  {
                    backgroundColor: item[F('IsAvailable')]
                      ? '#E0F1E5'
                      : '#F8E5E0',
                  },
                ]}
              >
                <Text
                  style={{
                    color: item[F('IsAvailable')]
                      ? '#28633C'
                      : '#994637',
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {item[F('IsAvailable')]
                    ? tr('Selling', 'Đang bán')
                    : tr('Unavailable', 'Ngừng bán')}
                </Text>
              </View>
            </View>

            <Text style={s.categoryText}>
              {cat
                ? catName(cat)
                : tr('Uncategorized', 'Chưa phân loại')}
            </Text>

            <Text style={s.price}>
              {money(item[F('Price')])}
            </Text>

            <Text style={s.meta}>
              {item[F('PreparationTime')]} {tr('min', 'phút')} ·{' '}
              {quick ? t('quick', lang) : t('regular', lang)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={s.actions}>
          <TouchableOpacity
            style={s.smallBtn}
            activeOpacity={0.6}
            onPress={() =>
              navigation.navigate('Form', {
                mode: 'edit',
                dishId: item.id,
              })
            }
          >
            <Text style={s.smallBtnText}>
              {tr('Edit', 'Sửa')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.smallBtn, s.deleteBtn]}
            activeOpacity={0.6}
            disabled={isDeleting}
            onPress={() => askDelete(item)}
          >
            <Text style={[s.smallBtnText, s.deleteText]}>
              {isDeleting
                ? tr('Deleting...', 'Đang xóa...')
                : tr('Delete', 'Xóa')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadData?.();
    } catch (error) {
      console.error('Refresh dishes error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const dishCount = Array.isArray(dishes) ? dishes.length : 0;
  const categoryCount = Array.isArray(categories) ? categories.length : 0;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.headerInfo}>
          <Text style={s.eyebrow}>BIT240043_FoodManager</Text>

          <Text style={s.title}>
            {tr('Food Manager', 'Quản lý món ăn')}
          </Text>

          <Text style={s.subtitle}>
            {dishCount} {tr('dishes', 'món ăn')} ·{' '}
            {categoryCount} {tr('categories', 'danh mục')}
          </Text>
        </View>

        <TouchableOpacity
          style={s.langBtn}
          onPress={() => changeLang?.(lang === 'en' ? 'vi' : 'en')}
        >
          <Text style={s.langText}>
            {lang === 'en' ? 'EN / VI' : 'VI / EN'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Đã bỏ dòng trạng thái mạng, không ảnh hưởng chức năng đồng bộ. */}

      <TextInput
        style={s.search}
        placeholder={tr(
          'Search dishes by name…',
          'Tìm món ăn theo tên…'
        )}
        placeholderTextColor="#9B8E82"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView
        style={s.filters}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.filterTitle}>
          {tr('FILTERS & SORT', 'LỌC VÀ SẮP XẾP')}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.horizontalChips}
        >
          <TouchableOpacity
            onPress={() => setCategory('all')}
            style={[s.chip, category === 'all' && s.chipActive]}
          >
            <Text
              style={[
                s.chipText,
                category === 'all' && s.chipTextActive,
              ]}
            >
              {tr('All categories', 'Tất cả danh mục')}
            </Text>
          </TouchableOpacity>

          {(Array.isArray(categories) ? categories : []).map((c, index) => (
            <TouchableOpacity
              key={`${catId(c)}_${index}`}
              onPress={() => setCategory(catId(c))}
              style={[
                s.chip,
                category === catId(c) && s.chipActive,
              ]}
            >
              <Text
                style={[
                  s.chipText,
                  category === catId(c) && s.chipTextActive,
                ]}
              >
                {catName(c)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.segmentRow}>
          {[
            ['all', tr('All', 'Tất cả')],
            ['yes', tr('Selling', 'Đang bán')],
            ['no', tr('Stopped', 'Ngừng bán')],
          ].map(([v, label]) => (
            <TouchableOpacity
              key={v}
              onPress={() => setAvailable(v)}
              style={[s.segment, available === v && s.segmentActive]}
            >
              <Text
                style={[
                  s.segmentText,
                  available === v && s.segmentTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.priceRow}>
          <TextInput
            style={[s.priceInput, { flex: 1 }]}
            value={minPrice}
            onChangeText={setMinPrice}
            keyboardType="numeric"
            placeholder={tr('Min price', 'Giá từ')}
            placeholderTextColor="#9B8E82"
          />

          <Text style={{ color: '#8D7C6C' }}>—</Text>

          <TextInput
            style={[s.priceInput, { flex: 1 }]}
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="numeric"
            placeholder={tr('Max price', 'Giá đến')}
            placeholderTextColor="#9B8E82"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.horizontalChips}
        >
          {[
            ['none', tr('Default', 'Mặc định')],
            ['asc', tr('Price ↑', 'Giá tăng')],
            ['desc', tr('Price ↓', 'Giá giảm')],
            ['time', tr('Prep time ↑', 'Thời gian ↑')],
          ].map(([v, label]) => (
            <TouchableOpacity
              key={v}
              onPress={() => setSort(v)}
              style={[s.chip, sort === v && s.chipActive]}
            >
              <Text
                style={[
                  s.chipText,
                  sort === v && s.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity onPress={reset} style={s.reset}>
          <Text style={s.resetText}>
            {tr('Clear filters', 'Xóa bộ lọc')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={s.listHeading}>
        <Text style={s.sectionTitle}>
          {tr('Dishes', 'Danh sách món')}
        </Text>

        <Text style={s.count}>
          {filtered.length} {tr('results', 'kết quả')}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) =>
          `${String(item.id)}_${index}`
        }
        renderItem={renderDish}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        extraData={`${lang}-${deletingId}`}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(refreshing || loading)}
            onRefresh={refresh}
            tintColor="#795A43"
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 32 }}>🥣</Text>

            <Text style={s.emptyTitle}>
              {tr('No dishes found', 'Không tìm thấy món ăn')}
            </Text>

            <Text style={s.emptyText}>
              {tr(
                'Try changing the filters or add a dish.',
                'Thử thay đổi bộ lọc hoặc thêm món mới.'
              )}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={s.fab}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Form', { mode: 'create' })
        }
      >
        <Text style={s.fabPlus}>＋</Text>
        <Text style={s.fabText}>
          {tr('Add dish', 'Thêm món')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#92745C',
    fontWeight: '800',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#493629',
    marginTop: 4,
  },
  subtitle: {
    color: '#917F6F',
    fontSize: 12,
    marginTop: 3,
  },
  langBtn: {
    borderWidth: 1,
    borderColor: '#D8C7B6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFDF8',
    marginLeft: 8,
  },
  langText: {
    fontWeight: '800',
    color: '#684C37',
    fontSize: 12,
  },
  search: {
    marginHorizontal: 16,
    backgroundColor: '#FFFDFA',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E7DCCF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#493629',
    marginBottom: 8,
  },
  filters: {
    maxHeight: 235,
    marginHorizontal: 16,
    backgroundColor: '#F1E8DC',
    borderRadius: 15,
    padding: 12,
  },
  filterTitle: {
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: '800',
    color: '#8B7058',
    marginBottom: 9,
  },
  horizontalChips: {
    gap: 8,
    paddingBottom: 8,
    paddingVertical: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9C7B4',
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#684C37',
    borderColor: '#684C37',
  },
  chipText: {
    fontSize: 12,
    color: '#725943',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF8EE',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 5,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E0D2C3',
  },
  segmentActive: {
    backgroundColor: '#E2D1BE',
    borderColor: '#B99C7E',
  },
  segmentText: {
    fontSize: 11,
    color: '#816A55',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#503A29',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInput: {
    backgroundColor: '#FFFDF9',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E0D2C3',
    fontSize: 12,
    color: '#493629',
  },
  reset: {
    alignSelf: 'flex-end',
    paddingVertical: 5,
  },
  resetText: {
    color: '#87674D',
    fontSize: 12,
    fontWeight: '700',
  },
  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#493629',
  },
  count: {
    fontSize: 12,
    color: '#947F6C',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFDFA',
    borderRadius: 16,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFE4D8',
  },
  dishContent: {
    flexDirection: 'row',
    gap: 11,
  },
  photo: {
    width: 94,
    height: 112,
    borderRadius: 12,
    backgroundColor: '#EFE4D8',
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  dishName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#493629',
  },
  pill: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    color: '#9B8877',
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#79583E',
    marginTop: 5,
  },
  meta: {
    fontSize: 11,
    color: '#897A6C',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 2,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#DCCBBB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#684C37',
  },
  deleteBtn: {
    borderColor: '#E9C9C2',
    backgroundColor: '#FFF8F6',
  },
  deleteText: {
    color: '#A33D31',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 35,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#684C37',
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9B8877',
    marginTop: 5,
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    backgroundColor: '#684C37',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 4,
  },
  fabPlus: {
    color: '#FFF8EE',
    fontSize: 22,
    lineHeight: 22,
  },
  fabText: {
    color: '#FFF8EE',
    fontWeight: '800',
    fontSize: 13,
  },
});