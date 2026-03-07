import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  deleteCategory,
  getSettings,
  patchSettings,
} from '@/src/lib/storage';
import DraggableList from '@/src/components/DraggableList';

export default function CategoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);

  const load = useCallback(() => {
    getSettings().then((s) => setCategories(s.categoryOrder));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (index: number) => {
    const name = categories[index];
    Alert.alert(
      '部位を削除',
      `「${name}」を削除しますか？\nこの部位の種目は「その他」に移動します。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const next = categories.filter((_, i) => i !== index);
            setCategories(next);
            await deleteCategory(name);
          },
        },
      ],
    );
  };

  const handleReorder = async (newOrder: string[]) => {
    setCategories(newOrder);
    await patchSettings({ categoryOrder: newOrder });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>部位がありません。{'\n'}右下の ＋ から追加してください。</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <DraggableList
              data={categories}
              keyExtractor={(cat) => cat}
              itemHeight={52}
              onReorder={handleReorder}
              renderItem={(cat, index, isDragging) => (
                <View style={[styles.row, index < categories.length - 1 && styles.rowBorder, isDragging && styles.rowDragging]}>
                  <FontAwesome name="bars" size={15} color="#ccc" style={styles.dragHandle} />
                  <Pressable style={styles.rowInner} onPress={() => router.push(`/category/${encodeURIComponent(cat)}` as never)}>
                    <Text style={styles.rowLabel}>{cat}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(index)} hitSlop={12} style={styles.actionBtn}>
                    <FontAwesome name="trash-o" size={17} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={() => router.push('/category/add' as never)}>
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 100, flexGrow: 1 },

  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  rowDragging: { backgroundColor: '#f0f5ff' },
  dragHandle: { marginRight: 12 },
  rowInner: { flex: 1 },
  rowLabel: { fontSize: 15 },
  actionBtn: { padding: 6, marginLeft: 4 },

  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#999', marginTop: 16, lineHeight: 22 },

  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
