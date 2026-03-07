import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { getSettings, patchSettings } from '@/src/lib/storage';

export default function CategoryAddScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    getSettings().then((s) => setExistingCategories(s.categoryOrder));
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingCategories.includes(trimmed)) {
      Alert.alert('エラー', 'その部位はすでに存在します');
      return;
    }
    await patchSettings({ categoryOrder: [...existingCategories, trimmed] });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: '部位を追加' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>名前</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="例: 胸、背中、肩"
            placeholderTextColor="#aaa"
            returnKeyType="done"
            autoFocus
            onSubmitEditing={handleSave}
          />
        </View>
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
