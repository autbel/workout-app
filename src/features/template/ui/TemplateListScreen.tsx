import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { deleteTemplate, getTemplates } from '@/src/lib/storage';
import type { WorkoutTemplate } from '@/src/types';

export default function TemplateListScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const load = useCallback(() => {
    getTemplates().then(setTemplates);
  }, []);

  // 画面に戻るたびに再読み込み
  useFocusEffect(load);

  const handleDelete = (t: WorkoutTemplate) => {
    Alert.alert(
      'テンプレートを削除',
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

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>テンプレートがありません。{'\n'}右下の ＋ から追加してください。</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/template/${item.id}`)}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.exercises.length} エクササイズ</Text>
            </View>
            <Pressable onPress={() => handleDelete(item)} hitSlop={12}>
              <FontAwesome name="trash" size={20} color="#c0392b" />
            </Pressable>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={templates.length === 0 && styles.emptyContainer}
      />

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/template/new')}
      >
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#e0e0e0' },
  empty: { textAlign: 'center', color: '#999', marginTop: 16, lineHeight: 22 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
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
