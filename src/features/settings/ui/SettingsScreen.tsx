import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { DEFAULT_CATEGORY_ORDER, getSettings, patchSettings } from '@/src/lib/storage';
import type { AppSettings } from '@/src/lib/storage';

const DEFAULT: AppSettings = {
  unit: 'kg',
  recentSessionCount: 3,
  timerSoundEnabled: true,
  timerVibrationEnabled: true,
  categoryOrder: DEFAULT_CATEGORY_ORDER,
  prExercises: ['ベンチプレス', 'スクワット', 'デッドリフト'],
};

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (active) setSettings({ ...DEFAULT, ...s });
      });
      return () => { active = false; };
    }, []),
  );

  async function toggle<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = await patchSettings({ [key]: value } as Partial<AppSettings>);
    setSettings({ ...DEFAULT, ...updated });
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ─── コンテンツ ─── */}
      <Text style={styles.sectionTitle}>コンテンツ</Text>
      <View style={styles.card}>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/category' as never)}>
          <FontAwesome name="tag" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>部位の編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/exercise' as never)}>
          <FontAwesome name="heartbeat" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>種目の編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/template' as never)}>
          <FontAwesome name="list-ul" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>メニューの編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/pr-exercises' as never)}>
          <FontAwesome name="trophy" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>自己記録の編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
      </View>

      {/* ─── 単位 ─── */}
      <Text style={styles.sectionTitle}>単位</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <FontAwesome name="balance-scale" size={18} color="#555" style={styles.icon} />
          <Text style={styles.rowLabel}>重量の単位</Text>
          <View style={styles.unitToggle}>
            <Pressable
              style={[styles.unitBtn, settings.unit === 'kg' && styles.unitBtnActive]}
              onPress={() => toggle('unit', 'kg')}
            >
              <Text style={[styles.unitBtnText, settings.unit === 'kg' && styles.unitBtnTextActive]}>
                kg
              </Text>
            </Pressable>
            <Pressable
              style={[styles.unitBtn, settings.unit === 'lb' && styles.unitBtnActive]}
              onPress={() => toggle('unit', 'lb')}
            >
              <Text style={[styles.unitBtnText, settings.unit === 'lb' && styles.unitBtnTextActive]}>
                lb
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── タイマー ─── */}
      <Text style={styles.sectionTitle}>タイマー</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <FontAwesome name="volume-up" size={18} color="#555" style={styles.icon} />
          <Text style={styles.rowLabel}>サウンド</Text>
          <Switch
            value={settings.timerSoundEnabled}
            onValueChange={(v) => toggle('timerSoundEnabled', v)}
          />
        </View>
        <View style={styles.row}>
          <FontAwesome name="mobile" size={18} color="#555" style={styles.icon} />
          <Text style={styles.rowLabel}>バイブレーション</Text>
          <Switch
            value={settings.timerVibrationEnabled}
            onValueChange={(v) => toggle('timerVibrationEnabled', v)}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  icon: { width: 26, marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15 },

  unitToggle: { flexDirection: 'row', gap: 4 },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  unitBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  unitBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
  unitBtnTextActive: { color: '#fff' },
});
