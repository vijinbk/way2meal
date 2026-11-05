import { type AuthTokens, otpCodeSchema, phoneSchema } from '@way2meal/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, ErrorText, Field, Muted, Screen, Title } from '@/components/ui';
import { t } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { space } from '@/lib/theme';

export default function LoginScreen() {
  const qc = useQueryClient();
  const setTokens = useAuth((s) => s.setTokens);
  const [phone, setPhone] = useState('');
  const [normalized, setNormalized] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const parsed = phoneSchema.safeParse(phone);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      await api('/auth/otp/request', { method: 'POST', body: { phone: parsed.data } });
      setNormalized(parsed.data);
    });

  const verify = () =>
    run(async () => {
      if (!normalized || !otpCodeSchema.safeParse(code).success)
        throw new Error(t('login.invalidCode'));
      const res = await api<{ tokens: AuthTokens }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone: normalized, code },
      });
      qc.clear();
      await setTokens(res.tokens);
    });

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ gap: space.lg, paddingTop: space.xl * 2 }}
      >
        <View style={{ gap: space.xs }}>
          <Title>{t('login.title')}</Title>
          <Muted>{t('login.subtitle')}</Muted>
        </View>
        {normalized === null ? (
          <>
            <Field
              label={t('login.phone')}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChangeText={setPhone}
            />
            <ErrorText error={error} />
            <Button label={t('login.sendCode')} loading={busy} onPress={() => void sendCode()} />
          </>
        ) : (
          <>
            <Muted>{t('login.codeSentTo', { phone: normalized })}</Muted>
            <Field
              label={t('login.code')}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              value={code}
              onChangeText={setCode}
            />
            <ErrorText error={error} />
            <Button label={t('login.verify')} loading={busy} onPress={() => void verify()} />
            <Button
              label={t('login.changeNumber')}
              variant="secondary"
              onPress={() => {
                setNormalized(null);
                setCode('');
              }}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
