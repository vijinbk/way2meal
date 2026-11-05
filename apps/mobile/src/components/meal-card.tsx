import type { ResolvedMenu } from '@way2meal/shared';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import { colors, space } from '@/lib/theme';
import { Badge, Card } from './ui';

export function nutritionText(m: ResolvedMenu): string | null {
  if (m.proteinG == null && m.kcalMin == null) return null;
  const kcal =
    m.kcalMin != null && m.kcalMax != null && m.kcalMax !== m.kcalMin
      ? `${m.kcalMin}–${m.kcalMax}`
      : String(m.kcalMin ?? m.kcalMax ?? '');
  return t('menu.badge', { protein: m.proteinG ?? '–', kcal });
}

/** One slot's meal: items, nutrition badge, special/holiday flags. `footer` adds per-screen info. */
export function MealCard({
  meal,
  title,
  footer,
  showDescriptions = false,
}: {
  meal: ResolvedMenu;
  title?: string;
  footer?: ReactNode;
  showDescriptions?: boolean;
}) {
  const nutrition = nutritionText(meal);
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.slot}>{title ?? t(`slot.${meal.slot}`)}</Text>
        {meal.source === 'OVERRIDE' && <Badge tone="amber">{meal.note ?? t('menu.special')}</Badge>}
      </View>

      {!meal.isServiceDay ? (
        <Badge tone={meal.holiday ? 'red' : 'neutral'}>
          {meal.holiday ? t('home.holiday', { reason: meal.holiday.reason }) : t('menu.closed')}
        </Badge>
      ) : meal.items.length === 0 ? (
        <Text style={styles.muted}>{t('home.noMenu')}</Text>
      ) : (
        <>
          {meal.imageUrl && (
            <Image
              source={meal.imageUrl}
              style={styles.image}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          )}
          <View style={{ gap: 2 }}>
            {meal.items.map((item) => (
              <View key={item.id}>
                <Text style={styles.item}>• {item.name}</Text>
                {showDescriptions && item.description && (
                  <Text style={styles.description}>{item.description}</Text>
                )}
              </View>
            ))}
          </View>
          {showDescriptions && meal.description && (
            <Text style={styles.muted}>{meal.description}</Text>
          )}
          <View style={styles.badges}>
            {nutrition && <Badge tone="brand">{nutrition}</Badge>}
            {meal.tagline && <Badge>{meal.tagline}</Badge>}
          </View>
        </>
      )}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  slot: { fontSize: 18, fontWeight: '700', color: colors.text },
  item: { fontSize: 15, color: colors.text },
  description: { fontSize: 13, color: colors.muted, marginLeft: 12 },
  muted: { fontSize: 14, color: colors.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: colors.border },
});
