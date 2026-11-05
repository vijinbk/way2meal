import { profileUpdateSchema } from '@way2meal/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';

/** Collects the name (required) and optional details. Addresses are added at checkout (M3). */
export default function OnboardingScreen() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [diet, setDiet] = useState('');
  const [formError, setFormError] = useState<unknown>(null);

  const save = useMutation({
    mutationFn: (body: unknown) => api('/me', { method: 'PATCH', body, auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const submit = () => {
    setFormError(null);
    if (!name.trim()) return setFormError(new Error(t('onboarding.nameRequired')));
    const body = {
      name: name.trim(),
      email: email.trim() || null,
      dietaryNote: diet.trim() || null,
    };
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) return setFormError(new Error(parsed.error.issues[0]?.message));
    save.mutate(parsed.data);
  };

  return (
    <Screen>
      <Title>{t('onboarding.title')}</Title>
      <Field label={t('onboarding.name')} autoComplete="name" value={name} onChangeText={setName} />
      <Field
        label={t('onboarding.email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label={t('onboarding.diet')}
        placeholder={t('onboarding.dietPlaceholder')}
        value={diet}
        onChangeText={setDiet}
      />
      <ErrorText error={formError ?? save.error} />
      <Button label={t('onboarding.save')} loading={save.isPending} onPress={submit} />
    </Screen>
  );
}
