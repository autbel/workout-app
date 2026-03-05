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

import { deleteTemplate, getTemplates, saveTemplates } from '@/src/lib/storage';
import type { WorkoutTemplate } from '@/src/types';
import DraggableList from '@/src/components/DraggableList';

export default function TemplateListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const load = useCallback(() => {
    getTemplates().then(setTemplates);
  }, []);

  // 画面に戻るたびに再読み込み
  useFocusEffect(load);

  const handleDelete = (t: WorkoutTemplate) => {
    Alert.alert(
      'メニューを削除',
      `「${t.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(t.id);
            load();
          },
        },
      ],
    );
  };

  const handleReorder = async (newOrder: WorkoutTemplate[]) => {
    setTemplates(newOrder);
    await saveTemplates(newOrder);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {templates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>メニューがありません。{'\n'}右下の ＋ から追加してください。</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <DraggableList
              data={templates}
              keyExtractor={(item) => item.id}
              itemHeight={68}
              onReorder={handleReorder}
              renderItem={(item, index, isDragging) => (
                <View style={[styles.row, index < templates.length - 1 && styles.separator, isDragging && styles.rowDragging]}>
                  <FontAwesome name="bars" size={16} color="#ccc" style={styles.dragHandle} />
                  <Pressable style={styles.rowInner} onPress={() => router.push(`/template/${item.id}`)}>
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.sub}>{item.exercises.length} 種目</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} hitSlop={12}>
                    <FontAwesome name="trash-o" size={17} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/template/new')}
      >
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 100, flexGrow: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDragging: { backgroundColor: '#f0f5ff' },
  rowInner: { flex: 1 },
  rowText: {},
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  dragHandle: { marginRight: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 16, lineHeight: 22 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
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
