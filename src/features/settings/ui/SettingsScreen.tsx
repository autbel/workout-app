import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>コンテンツ</Text>
      <View style={styles.card}>
        <Pressable
          style={styles.row}
          onPress={() => router.push('/template')}
        >
          <FontAwesome name="list-ul" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>テンプレートを管理</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>設定（Task 9 で実装）</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <FontAwesome name="balance-scale" size={18} color="#888" style={styles.icon} />
          <Text style={[styles.rowLabel, { color: '#aaa' }]}>単位: kg / lb</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  card: { backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: { width: 24, marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15 },
});
