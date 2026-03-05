import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  deleteCategory,
  getSettings,
  patchSettings,
  renameCategory,
} from '@/src/lib/storage';
import DraggableList from '@/src/components/DraggableList';

export default function CategoryScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // null = 新規追加

  const load = useCallback(() => {
    getSettings().then((s) => setCategories(s.categoryOrder));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditingIndex(null);
    setEditingName('');
    setModalVisible(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setEditingName(categories[index]);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    if (editingIndex === null) {
      // 追加
      if (categories.includes(trimmed)) {
        Alert.alert('エラー', 'その部位はすでに存在します');
        return;
      }
      const next = [...categories, trimmed];
      setCategories(next);
      await patchSettings({ categoryOrder: next });
    } else {
      // 編集（リネーム）
      const oldName = categories[editingIndex];
      if (oldName !== trimmed) {
        if (categories.includes(trimmed)) {
          Alert.alert('エラー', 'その部位はすでに存在します');
          return;
        }
        const next = categories.map((c, i) => (i === editingIndex ? trimmed : c));
        setCategories(next);
        await renameCategory(oldName, trimmed);
      }
    }
    setModalVisible(false);
  };

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
                  <Pressable style={styles.rowInner} onPress={() => openEdit(index)}>
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
      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={openAdd}>
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>

      {/* 追加・編集 Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.dialogTitle}>
              {editingIndex === null ? '部位を追加' : '部位を編集'}
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="例: 胸、背中、肩"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.dialogBtns}>
              <Pressable style={styles.dialogCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.dialogCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogSave, !editingName.trim() && styles.dialogSaveDisabled]}
                onPress={handleSave}
                disabled={!editingName.trim()}
              >
                <Text style={styles.dialogSaveText}>保存</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '80%',
  },
  dialogTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14, color: '#111' },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  dialogBtns: { flexDirection: 'row', gap: 8 },
  dialogCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  dialogCancelText: { fontSize: 15, color: '#555', fontWeight: '600' },
  dialogSave: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  dialogSaveDisabled: { backgroundColor: '#93c5fd' },
  dialogSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
