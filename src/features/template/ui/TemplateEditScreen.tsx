import { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { getTemplates, upsertTemplate } from '@/src/lib/storage';
import { generateId } from '@/src/lib/id';
import { useWorkoutStore } from '@/src/store/workoutStore';
import DraggableList from '@/src/components/DraggableList';
import type { Exercise, WorkoutTemplate } from '@/src/types';

type DraftExercise = { id: string; name: string };

export default function TemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();

  const { pickedTemplateExercise, setPickedTemplateExercise } = useWorkoutStore();

  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);

  useEffect(() => {
    navigation.setOptions({
      title: isNew ? 'メニューを追加' : 'メニューを編集',
      headerBackTitle: 'メニューの編集',
    });

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

  useFocusEffect(
    useCallback(() => {
      if (!pickedTemplateExercise) return;
      setExercises((prev) => [...prev, pickedTemplateExercise]);
      setPickedTemplateExercise(null);
    }, [pickedTemplateExercise, setPickedTemplateExercise]),
  );

  const removeExercise = (exId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exId));
  };

  const handleSave = async () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      Alert.alert('エラー', 'メニュー名を入力してください');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('エラー', '種目を1つ以上追加してください');
      return;
    }

    // 重複チェック（編集時は自分自身を除外）
    const all = await getTemplates();
    const isDuplicate = all.some((t) => t.name === trimmedName && t.id !== id);
    if (isDuplicate) {
      Alert.alert('エラー', 'そのメニュー名はすでに存在します');
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
          <Text style={styles.label}>メニュー名</Text>
          <TextInput
            style={styles.input}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="例: 脚の日"
            returnKeyType="done"
          />
        </View>

        {/* 種目リスト */}
        <View style={styles.section}>
          <Text style={styles.label}>種目</Text>
          <DraggableList
            data={exercises}
            keyExtractor={(item) => item.id}
            itemHeight={48}
            onReorder={setExercises}
            renderItem={(item, index, isDragging, onMoveUp, onMoveDown) => (
              <View style={[styles.exRow, isDragging && styles.exRowDragging]}>
                <FontAwesome name="bars" size={14} color="#ccc" style={styles.dragHandle} />
                <Text style={styles.exIndex}>{index + 1}.</Text>
                <Text style={styles.exName}>{item.name}</Text>
                <View style={styles.moveButtons}>
                  <Pressable onPress={onMoveUp ?? undefined} disabled={!onMoveUp} style={styles.moveBtn}>
                    <FontAwesome name="chevron-up" size={11} color={onMoveUp ? '#888' : '#ddd'} />
                  </Pressable>
                  <Pressable onPress={onMoveDown ?? undefined} disabled={!onMoveDown} style={styles.moveBtn}>
                    <FontAwesome name="chevron-down" size={11} color={onMoveDown ? '#888' : '#ddd'} />
                  </Pressable>
                </View>
                <Pressable onPress={() => removeExercise(item.id)} hitSlop={12}>
                  <FontAwesome name="times-circle" size={20} color="#c0392b" />
                </Pressable>
              </View>
            )}
          />

          <Pressable style={styles.addExBtn} onPress={() => router.push('/template/pick-exercise' as never)}>
            <FontAwesome name="plus" size={14} color="#2563eb" />
            <Text style={styles.addExText}>種目を追加</Text>
          </Pressable>
        </View>

        {/* 保存ボタン */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </ScrollView>
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
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  exRowDragging: { backgroundColor: '#f0f5ff', borderRadius: 6 },
  dragHandle: { marginRight: 2 },
  exIndex: { fontSize: 14, color: '#888', width: 20 },
  exName: { flex: 1, fontSize: 15 },
  moveButtons: { flexDirection: 'column', marginHorizontal: 4 },
  moveBtn: { padding: 3 },
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
