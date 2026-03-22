import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.updated}>最終更新日：2026年3月14日</Text>

      <Text style={styles.intro}>
        本プライバシーポリシー（以下「本ポリシー」）は、当アプリがお客様の情報をどのように取り扱うかを説明するものです。当アプリをご利用いただくことで、本ポリシーに同意したものとみなされます。
      </Text>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 1. 収集する情報</Text>
        <Text style={styles.body}>
          当アプリは、お客様の個人情報を収集しません。{'\n\n'}
          当アプリが端末内に保存するデータは以下のとおりです：{'\n'}
          ・トレーニング記録（種目・セット数・重量・回数）{'\n'}
          ・アプリの設定情報（単位・タイマー設定など）{'\n'}
          ・作成したメニュー（テンプレート）{'\n\n'}
          これらのデータはお使いの端末内にのみ保存され、当アプリの開発者を含む第三者がアクセスすることはできません。{'\n\n'}
          また、インターバルタイマーの終了をお知らせするために端末の通知機能を使用します。通知はすべて端末内でのみ生成され、外部サーバーとの通信は行いません。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 2. 情報の利用目的</Text>
        <Text style={styles.body}>
          端末内に保存されたデータは、以下の目的にのみ使用されます：{'\n'}
          ・トレーニング記録の表示および管理{'\n'}
          ・過去の記録を参照した入力補助{'\n'}
          ・アプリ設定の保持
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 3. 情報の共有・第三者提供</Text>
        <Text style={styles.body}>
          当アプリは、お客様のデータを第三者に提供・販売・共有することは一切ありません。{'\n\n'}
          法令に基づく開示要求があった場合を除き、いかなる状況においてもお客様のデータを外部に提供することはありません。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 4. データの保存とセキュリティ</Text>
        <Text style={styles.body}>
          すべてのデータはお使いの端末のローカルストレージに保存されます。外部サーバーへの送信は行いません。{'\n\n'}
          バックアップ機能を使用した場合、エクスポートされたファイルはお客様が指定した端末のストレージに保存されます。エクスポートしたファイルの管理・取り扱いはお客様ご自身の責任において行ってください。{'\n\n'}
          【データの保持期間】{'\n'}
          保存されたデータは、以下のいずれかの操作を行うまで端末内に保持されます：{'\n'}
          ・アプリをアンインストールする{'\n'}
          ・端末の「設定」→「アプリ」→ 当アプリ →「ストレージ」→「データを消去」を実行する
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 5. お客様の権利</Text>
        <Text style={styles.body}>
          お客様はいつでも以下の操作を行うことができます：{'\n'}
          ・アプリをアンインストールすることで、端末内のすべてのデータを削除する{'\n'}
          ・バックアップ機能を使用してデータをエクスポートする{'\n'}
          ・エクスポートしたファイルを外部で保管・管理する
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 6. 広告・トラッキングについて</Text>
        <Text style={styles.body}>
          当アプリは以下を一切使用していません：{'\n'}
          ・広告SDK{'\n'}
          ・アナリティクスSDK{'\n'}
          ・クラッシュレポートツール{'\n'}
          ・ユーザー行動のトラッキング
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 7. EU ユーザーの方へ（GDPR）</Text>
        <Text style={styles.body}>
          欧州経済領域（EEA）にお住まいのお客様は、一般データ保護規則（GDPR）に基づき以下の権利を有します：{'\n'}
          ・保存されたデータへのアクセス権{'\n'}
          ・データの訂正・削除を求める権利{'\n'}
          ・データ処理への異議申し立て権{'\n\n'}
          当アプリのデータはすべて端末内に保存されているため、アプリをアンインストールするか端末の設定からデータを消去することで、すべてのデータを削除できます。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 8. 13歳未満のお子様について</Text>
        <Text style={styles.body}>
          当アプリは13歳未満のお子様を対象としていません。{'\n'}
          13歳未満のお子様は保護者の同意のもとでご利用ください。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 9. 本ポリシーの変更</Text>
        <Text style={styles.body}>
          本ポリシーは、法令の変更やアプリの機能追加などに応じて更新されることがあります。重要な変更を行った場合は、アプリのアップデートを通じてお知らせします。{'\n\n'}
          変更後も引き続きご利用いただいた場合、変更後のポリシーに同意したものとみなします。
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>■ 10. お問い合わせ</Text>
        <Text style={styles.body}>
          本ポリシーに関するご質問・ご不明な点は、Google Play ストアのレビュー欄よりお知らせください。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 48 },
  updated: { fontSize: 12, color: '#aaa', marginBottom: 16 },
  intro: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 24 },
  section: { marginBottom: 24 },
  heading: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 8 },
  body: { fontSize: 14, color: '#555', lineHeight: 22 },
});
