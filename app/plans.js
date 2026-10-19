import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries, plans } from '../src/data/catalogue';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

const problems = {
  sold_out: 'Lifetime is sold out.',
  plan_not_configured: 'This plan is not ready to charge yet.',
  unknown_plan: 'That plan is not available.',
  sign_in_required: 'Sign in before paying.',
  paystack_initialize_failed: 'Paystack could not start checkout.',
  purchase_create_failed: 'The purchase could not be created.',
};

export default function PlansScreen() {
  const { country, premium, refreshPremium } = useApp();
  const current = countries.find((item) => item.code === country) || countries[0];
  const naira = current.currency === 'NGN';
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function checkout(planId) {
    setMessage('');
    setBusy(planId);
    const { data, error } = await supabase.functions.invoke('paystack-checkout', {
      body: { plan_id: planId, surface: 'app' },
    });
    if (error || !data?.authorization_url) {
      let code = data?.error;
      try {
        if (!code && error?.context) code = (await error.context.json())?.error;
      } catch {
        code = '';
      }
      setMessage(problems[code] || 'Checkout could not start.');
      setBusy('');
      return;
    }
    await WebBrowser.openBrowserAsync(data.authorization_url);
    setMessage('Checking payment…');
    let active = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      active = await refreshPremium();
      if (active) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setMessage(active ? 'Premium is active.' : 'Payment is still confirming. Pull back here in a moment.');
    setBusy('');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Plans" back />
      <Text style={styles.lead}>
        {premium ? 'You are on Premium.' : 'You are on Free. Premium adds mixes, downloads, the sleep timer, and the voice guide.'}
      </Text>
      {plans.map((plan) => (
        <View key={plan.id} style={styles.card}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.price}>{naira ? plan.ngn : plan.usd}</Text>
          <Text style={styles.period}>{plan.period}</Text>
          {naira ? null : <Text style={styles.charge}>Charged as {plan.charge}</Text>}
          <Pressable style={styles.button} onPress={() => checkout(plan.id)} disabled={Boolean(busy) || premium}>
            <Text style={styles.buttonText}>
              {premium ? 'Premium active' : busy === plan.id ? 'Opening Paystack' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      ))}
      {message ? <Text style={styles.fine}>{message}</Text> : null}
      <Text style={styles.fine}>
        Cards only in the app: Visa, Mastercard, Verve, and Amex. Paystack charges naira. Premium turns on after Paystack confirms the payment.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32, paddingHorizontal: 20 },
  lead: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  name: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  price: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 28,
    marginTop: 6,
  },
  period: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    marginTop: 2,
  },
  charge: {
    color: colors.amber,
    fontFamily: font.medium,
    fontSize: 13,
    marginTop: 8,
  },
  button: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 15,
  },
  fine: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
