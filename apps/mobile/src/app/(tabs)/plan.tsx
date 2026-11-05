import { Card, Muted, Screen, Title } from '@/components/ui';
import { t } from '@/i18n';

export default function PlanScreen() {
  return (
    <Screen>
      <Title>{t('tabs.plan')}</Title>
      <Card>
        <Muted>{t('soon.plan')}</Muted>
      </Card>
    </Screen>
  );
}
