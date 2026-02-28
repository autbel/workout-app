import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { generateId } from '@/src/lib/id';
import { getExercises } from '@/src/lib/storage';
import type { Exercise } from '@/src/types';

export interface PickedExercise {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  onSelect: (exercise: PickedExercise) => void;
  onClose: () => void;
  alreadyAdded?: string[]; // 追加済み種目 ID（グレーアウト用）
}

interface Section {
  title: string;
  data: Exercise[];
}

const CATEGORY_ORDER = ['胸', '肩', '腕', '背中', '脚', '腹'];

function buildSections(exercises: Exercise[]): Section[] {
  const map = new Map<string, Exercise[]>();

  // カテゴリ順に並べる
  for (const cat of CATEGORY_ORDER) {
    map.set(cat, []);
  }

  for (const ex of exercises) {
    const cat = ex.category ?? 'その他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(ex);
  }

  return Array.from(map.entries())
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}

export default function ExercisePicker({ visible, onSelect, onClose, alreadyAdded = [] }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (visible) {
      setCustomMode(false);
      setCustomName('');
      getExercises().then((all) => setSections(buildSections(all)));
    }
  }, [visible]);

  function handleSelect(ex: Exercise) {
    onSelect({ id: ex.id, name: ex.name });
    onClose();
  }

  function handleCustomAdd() {
    const name = customName.trim();
    if (!name) return;
    onSelect({ id: generateId(), name });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>種目を選択</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <FontAwesome name="times" size={20} color="#555" />
          </Pressable>
        </View>

        {/* 種目リスト */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const added = alreadyAdded.includes(item.id);
            return (
              <Pressable
                style={[styles.row, added && styles.rowAdded]}
                onPress={() => !added && handleSelect(item)}
              >
                <Text style={[styles.rowText, added && styles.rowTextAdded]}>
                  {item.name}
                </Text>
                {added && (
                  <Text style={styles.addedBadge}>追加済み</Text>
                )}
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              {customMode ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="種目名を入力"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCustomAdd}
                  />
                  <Pressable style={styles.customAddBtn} onPress={handleCustomAdd}>
                    <Text style={styles.customAddBtnText}>追加</Text>
                  </Pressable>
                  <Pressable onPress={() => setCustomMode(false)} hitSlop={12} style={{ marginLeft: 8 }}>
                    <FontAwesome name="times" size={18} color="#aaa" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.customBtn} onPress={() => setCustomMode(true)}>
                  <FontAwesome name="pencil" size={14} color="#2563eb" />
                  <Text style={styles.customBtnText}>カスタムで入力</Text>
                </Pressable>
              )}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  sectionHeader: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  rowAdded: { backgroundColor: '#fafafa' },
  rowText: { fontSize: 16 },
  rowTextAdded: { color: '#bbb' },
  addedBadge: { fontSize: 12, color: '#bbb' },

  footer: { padding: 20 },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
  },
  customBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },

  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  customAddBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  customAddBtnText: { color: '#fff', fontWeight: '700' },
});
