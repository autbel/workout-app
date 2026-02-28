import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { getTemplates, upsertTemplate } from '@/src/lib/storage';
import { generateId } from '@/src/lib/id';
import ExercisePicker from '@/src/components/ExercisePicker';
import type { Exercise, WorkoutTemplate } from '@/src/types';

type DraftExercise = { id: string; name: string };

export default function TemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();

  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? '新規テンプレート' : 'テンプレートを編集' });

    if (!isNew) {
      getTemplates().then((all) => {
        const found = all.find((t) => t.id === id);
        if (found) {
          setTemplateName(found.name);
          setExercises(found.exercises.map((e) => ({ id: e.id, name: e.name })));
        }
      });
    }
  }, [id, isNew, navigation]);

  const removeExercise = (exId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exId));
  };

  const handleSave = async () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      Alert.alert('エラー', 'テンプレート名を入力してください');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('エラー', 'エクササイズを1つ以上追加してください');
      return;
    }

    const template: WorkoutTemplate = {
      id: isNew ? generateId() : (id as string),
      name: trimmedName,
      exercises: exercises.map<Exercise>((e) => ({
        id: e.id,
        name: e.name,
        timerPresets: [],
      })),
    };

    await upsertTemplate(template);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* テンプレート名 */}
        <View style={styles.section}>
          <Text style={styles.label}>テンプレート名</Text>
          <TextInput
            style={styles.input}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="例: 脚の日"
            returnKeyType="done"
          />
        </View>

        {/* エクササイズリスト */}
        <View style={styles.section}>
          <Text style={styles.label}>エクササイズ</Text>
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.exRow}>
                <Text style={styles.exIndex}>{index + 1}.</Text>
                <Text style={styles.exName}>{item.name}</Text>
                <Pressable onPress={() => removeExercise(item.id)} hitSlop={12}>
                  <FontAwesome name="times-circle" size={20} color="#c0392b" />
                </Pressable>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />

          <Pressable style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
            <FontAwesome name="plus" size={14} color="#2563eb" />
            <Text style={styles.addExText}>エクササイズを追加</Text>
          </Pressable>
        </View>

        {/* 保存ボタン */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        alreadyAdded={exercises.map((e) => e.id)}
        onSelect={(picked) => setExercises((prev) => [...prev, { id: picked.id, name: picked.name }])}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exIndex: { fontSize: 14, color: '#888', width: 20 },
  exName: { flex: 1, fontSize: 15 },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addExText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
