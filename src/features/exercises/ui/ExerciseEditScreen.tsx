import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { getExercises, getSettings, upsertExercise, DEFAULT_CATEGORY_ORDER } from '@/src/lib/storage';
import type { Exercise } from '@/src/types';

export default function ExerciseEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [original, setOriginal] = useState<Exercise | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY_ORDER[0]);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORY_ORDER, 'その他']);

  useEffect(() => {
    getSettings().then((s) => {
      setCategories([...s.categoryOrder, 'その他']);
    });
    if (isNew) return;
    getExercises().then((list) => {
      const found = list.find((e) => e.id === id);
      if (found) {
        setOriginal(found);
        setName(found.name);
        setCategory(found.category ?? 'その他');
      }
    });
  }, [id, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await upsertExercise({
      ...(original ?? { timerPresets: [] }),
      id: isNew ? Date.now().toString() : id,
      name: name.trim(),
      category,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: isNew ? '種目を追加' : '種目を編集' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 名前 */}
        <Text style={styles.label}>名前</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="種目名を入力"
            placeholderTextColor="#aaa"
            returnKeyType="done"
            autoFocus={isNew}
          />
        </View>

        {/* カテゴリ */}
        <Text style={styles.label}>カテゴリ</Text>
        <View style={styles.chipGroup}>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 保存ボタン */}
        <Pressable
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
        >
          <Text style={styles.saveBtnText}>保 存</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#111',
    paddingVertical: 12,
  },

  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  chipText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#1d4ed8', fontWeight: '700' },

  saveBtn: {
    marginTop: 28,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#93c5fd' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
