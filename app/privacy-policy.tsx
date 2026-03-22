import { Stack } from 'expo-router';
import PrivacyPolicyScreen from '@/src/features/settings/ui/PrivacyPolicyScreen';

export default function PrivacyPolicy() {
  return (
    <>
      <Stack.Screen options={{ title: 'プライバシーポリシー' }} />
      <PrivacyPolicyScreen />
    </>
  );
}
