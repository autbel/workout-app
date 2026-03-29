import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { DEFAULT_CATEGORY_ORDER, getSettings, patchSettings } from '@/src/lib/storage';
import type { AppSettings } from '@/src/lib/storage';
import { exportBackup, importBackup } from '@/src/lib/backup';
import { requestNotificationPermission } from '@/src/lib/notifications';
import { restoreMissingPresets, resetToPresets } from '@/src/lib/seed';

const DEFAULT: AppSettings = {
  unit: 'kg',
  recentSessionCount: 3,
  timerSoundEnabled: false,
  timerVibrationEnabled: true,
  timerNotificationEnabled: false,
  categoryOrder: DEFAULT_CATEGORY_ORDER,
  prExercises: ['ベンチプレス', 'スクワット', 'デッドリフト'],
};

export default function SettingsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
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

  async function handleExport() {
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('エラー', 'バックアップの書き出しに失敗しました');
    }
  }

  function handleRestorePresets() {
    Alert.alert(
      'プリセットを復元',
      '削除された初期の部位・種目・メニューを追加します。\n自分で作ったデータはそのまま残ります。\n続けますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元する',
          onPress: async () => {
            await restoreMissingPresets();
            Alert.alert('完了', '削除されたプリセットを復元しました');
          },
        },
      ],
    );
  }

  function handleResetToPresets() {
    Alert.alert(
      '初期データにリセット',
      '部位・種目・メニューがすべて初期状態に戻ります。\nトレーニング履歴は削除されません。\n続けますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット', style: 'destructive',
          onPress: async () => {
            await resetToPresets();
            Alert.alert('完了', '初期データにリセットしました');
          },
        },
      ],
    );
  }

  async function handleNotificationToggle(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          '通知の許可が必要です',
          'スマホの設定アプリから「筋トレ日記」の通知を許可してください',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    toggle('timerNotificationEnabled', value);
  }

  function handleImport() {
    Alert.alert(
      'バックアップから復元',
      '現在のデータがすべて上書きされます。続けますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元する', style: 'destructive',
          onPress: async () => {
            try {
              await importBackup();
              Alert.alert('完了', 'データを復元しました');
            } catch (e) {
              Alert.alert('エラー', 'バックアップの読み込みに失敗しました');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ─── 管理 ─── */}
      <Text style={styles.sectionTitle}>管理</Text>
      <View style={styles.card}>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/category' as never)}>
          <MaterialIcons name="accessibility-new" size={24} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>部位の編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/exercise' as never)}>
          <FontAwesome5 name="dumbbell" size={16} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>種目の編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/template' as never)}>
          <FontAwesome name="clipboard" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>メニューの編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/pr-exercises' as never)}>
          <FontAwesome name="trophy" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>自己記録の編集</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
      </View>

      {/* ─── 初期データ ─── */}
      <Text style={styles.sectionTitle}>初期データ</Text>
      <View style={styles.card}>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={handleRestorePresets}>
          <FontAwesome name="refresh" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>削除したプリセットを復元</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={styles.row} onPress={handleResetToPresets}>
          <FontAwesome name="undo" size={18} color="#ef4444" style={styles.icon} />
          <Text style={[styles.rowLabel, { color: '#ef4444' }]}>部位・種目・メニューをリセット</Text>
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

      {/* ─── バックアップ ─── */}
      <Text style={styles.sectionTitle}>バックアップ</Text>
      <View style={styles.card}>
        <Pressable style={[styles.row, styles.rowBorder]} onPress={handleExport}>
          <FontAwesome name="upload" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>バックアップを書き出す</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
        <Pressable style={styles.row} onPress={handleImport}>
          <FontAwesome name="download" size={18} color="#2563eb" style={styles.icon} />
          <Text style={styles.rowLabel}>バックアップから復元</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
      </View>

      {/* ─── タイマー ─── */}
      <Text style={styles.sectionTitle}>タイマー</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <FontAwesome name="bell" size={18} color="#555" style={styles.icon} />
          <Text style={styles.rowLabel}>タイマー終了通知</Text>
          <Switch
            value={settings.timerNotificationEnabled}
            onValueChange={handleNotificationToggle}
          />
        </View>
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

      {/* ─── その他 ─── */}
      <Text style={styles.sectionTitle}>その他</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => router.push('/privacy-policy' as never)}>
          <FontAwesome name="file-text-o" size={18} color="#555" style={styles.icon} />
          <Text style={styles.rowLabel}>プライバシーポリシー</Text>
          <FontAwesome name="chevron-right" size={14} color="#bbb" />
        </Pressable>
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
  icon: { width: 26, marginRight: 12, textAlign: 'center' },
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
