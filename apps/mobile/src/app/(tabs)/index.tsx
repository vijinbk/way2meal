import { cutoffInstant, formatDuration, istDateOf } from '@way2meal/shared';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealCard } from '@/components/meal-card';
import { Badge, ErrorState, Loading, Muted, Title } from '@/components/ui';
import { t } from '@/i18n';
import { useConfig, useMenu, useProfile } from '@/lib/queries';
import { colors, space } from '@/lib/theme';
import { useNow } from '@/lib/use-now';

export default function HomeScreen() {
  const now = useNow();
  const today = istDateOf(now);
  const profile = useProfile();
  const config = useConfig();
  const menu = useMenu(today, today);

  const refreshing = menu.isRefetching || config.isRefetching;
  const refresh = () => {
    void menu.refetch();
    void config.refetch();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={{ gap: space.xs }}>
          <Title>{t('home.greeting', { name: profile.data?.name ?? '' })}</Title>
          <Muted>{t('home.today')}</Muted>
        </View>

        {menu.isPending || config.isPending ? (
          <Loading />
        ) : menu.error || config.error ? (
          <ErrorState error={menu.error ?? config.error} onRetry={refresh} />
        ) : (
          menu.data.map((meal) => {
            const cutoff = cutoffInstant(meal.date, meal.slot, config.data.cutoffs);
            const left = cutoff.getTime() - now.getTime();
            return (
              <MealCard
                key={meal.slot}
                meal={meal}
                footer={
                  meal.isServiceDay && (
                    <View style={{ gap: space.sm }}>
                      <Badge tone={left > 0 ? 'amber' : 'neutral'}>
                        {left > 0
                          ? t('home.cutoffIn', { time: formatDuration(left) })
                          : t('home.cutoffPassed')}
                      </Badge>
                      {/* Subscription status and "Skip today" arrive with plans in M3. */}
                      <Text style={styles.hint}>{t('home.noPlan')}</Text>
                    </View>
                  )
                }
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },
  hint: { fontSize: 13, color: colors.muted },
});
