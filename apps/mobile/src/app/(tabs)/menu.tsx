import { SLOTS, type Slot, addDays, isoWeekday, istDateOf } from '@way2meal/shared';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealCard } from '@/components/meal-card';
import { ErrorState, Loading, Title } from '@/components/ui';
import { type MessageKey, t } from '@/i18n';
import { useMenu } from '@/lib/queries';
import { colors, space } from '@/lib/theme';
import { useNow } from '@/lib/use-now';

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Mon–Sat (or whatever the kitchen serves) for this or next week, one slot at a time. */
export default function MenuScreen() {
  const now = useNow(60_000);
  const today = istDateOf(now);
  const [week, setWeek] = useState<'this' | 'next'>('this');
  const [slot, setSlot] = useState<Slot>('LUNCH');

  const monday = addDays(today, 1 - isoWeekday(today) + (week === 'next' ? 7 : 0));
  const menu = useMenu(monday, addDays(monday, 6));
  const days = (menu.data ?? []).filter((m) => m.slot === slot && (m.isServiceDay || m.holiday));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>{t('menu.title')}</Title>
        <Segmented
          value={week}
          onChange={setWeek}
          options={[
            { value: 'this', label: t('menu.thisWeek') },
            { value: 'next', label: t('menu.nextWeek') },
          ]}
        />
        <Segmented
          value={slot}
          onChange={setSlot}
          options={SLOTS.map((s) => ({ value: s, label: t(`slot.${s}`) }))}
        />

        {menu.isPending ? (
          <Loading />
        ) : menu.error ? (
          <ErrorState error={menu.error} onRetry={() => void menu.refetch()} />
        ) : (
          days.map((m) => (
            <MealCard
              key={m.date}
              meal={m}
              showDescriptions
              title={`${t(`weekday.${m.weekday}` as MessageKey)} ${m.date.slice(8)}/${m.date.slice(5, 7)}${m.date === today ? ` · ${t('menu.today')}` : ''}`}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },
  segmented: { flexDirection: 'row', backgroundColor: '#ECEDEA', borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: space.sm, borderRadius: 9, alignItems: 'center' },
  segmentSelected: { backgroundColor: colors.card },
  segmentText: { fontSize: 15, color: colors.muted, fontWeight: '500' },
  segmentTextSelected: { color: colors.brand, fontWeight: '700' },
});
