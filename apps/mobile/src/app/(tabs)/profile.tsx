import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { t } from '@/i18n';
import { logout } from '@/lib/api';
import { useConfig, useProfile } from '@/lib/queries';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const qc = useQueryClient();
  const profile = useProfile();
  const config = useConfig();
  const whatsapp = config.data?.whatsappNumber.replace(/\D/g, '');

  return (
    <Screen>
      <Title>{profile.data?.name ?? t('tabs.profile')}</Title>
      <Card>
        <View>
          <Muted>{t('profile.phone')}</Muted>
          <Text style={{ fontSize: 16, color: colors.text }}>{profile.data?.phone}</Text>
        </View>
        {profile.data?.email && (
          <Text style={{ fontSize: 15, color: colors.muted }}>{profile.data.email}</Text>
        )}
      </Card>
      {whatsapp ? (
        <Button
          label={t('profile.support')}
          variant="secondary"
          onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)}
        />
      ) : null}
      <Button
        label={t('profile.logout')}
        variant="secondary"
        onPress={() => {
          void logout().then(() => qc.clear());
        }}
      />
    </Screen>
  );
}
