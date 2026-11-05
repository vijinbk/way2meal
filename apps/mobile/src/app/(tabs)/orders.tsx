import { Card, Muted, Screen, Title } from '@/components/ui';
import { t } from '@/i18n';

export default function OrdersScreen() {
  return (
    <Screen>
      <Title>{t('tabs.orders')}</Title>
      <Card>
        <Muted>{t('soon.orders')}</Muted>
      </Card>
    </Screen>
  );
}
