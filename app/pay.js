import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { plans } from '../src/data/catalogue';
import { supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

const problems = {
  sold_out: 'Lifetime is sold out.',
  unknown_plan: 'That plan is not available.',
  sign_in_required: 'Sign in before paying.',
  card_incomplete: 'Enter the full card number, expiry, and security code.',
  card_missing: 'Add a card first.',
  charge_failed: 'The card was declined.',
};

function brandOf(number) {
  const digits = number.replace(/\D/g, '');
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^506[0-9]/.test(digits) || /^507[0-9]/.test(digits) || /^6500/.test(digits)) return 'Verve';
  return digits ? 'Card' : '';
}

export default function PayScreen() {
  const { plan: planId = 'premium_monthly' } = useLocalSearchParams();
  const { country, refreshPremium } = useApp();
  const plan = plans.find((item) => item.id === planId) || plans[0];
  const naira = country === 'NG';
  const [cards, setCards] = useState([]);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [extra, setExtra] = useState('');
  const [step, setStep] = useState('');
  const [reference, setReference] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadCards() {
    const { data } = await supabase.functions.invoke('billing', { body: { action: 'cards' } });
    setCards(data?.cards || []);
  }

  useEffect(() => {
    loadCards().catch(() => {});
    supabase.functions.invoke('billing', { body: { action: 'renew_mine' } }).catch(() => {});
  }, []);

  function explain(data) {
    return data?.message || problems[data?.error] || 'The payment could not be completed.';
  }

  async function afterCharge(data) {
    if (data?.status === 'send_pin' || data?.status === 'send_otp') {
      setStep(data.status);
      setReference(data.reference || '');
      setPurchaseId(data.purchase_id || '');
      setMessage(data.status === 'send_pin' ? 'Enter the card PIN.' : 'Enter the code sent to your phone or email.');
      return;
    }
    if (data?.status === 'open_url' && data.url) {
      setReference(data.reference || '');
      await WebBrowser.openBrowserAsync(data.url);
      const finished = await supabase.functions.invoke('billing', {
        body: { action: 'finish', reference: data.reference, plan_id: plan.id },
      });
      await afterCharge(finished.data);
      return;
    }
    if (!data?.ok) {
      setMessage(explain(data));
      return;
    }
    setCards(data.cards || []);
    setNumber('');
    setExpiry('');
    setCvv('');
    setExtra('');
    setStep('');
    await refreshPremium();
    setMessage('Premium is active.');
  }

  async function payNew() {
    const [month, year] = expiry.split('/');
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.functions.invoke('billing', {
      body: {
        action: 'charge',
        plan_id: plan.id,
        card: { number, cvv, expiry_month: month || '', expiry_year: year || '' },
      },
    });
    setBusy(false);
    if (error && !data) {
      setMessage('The payment could not be completed.');
      return;
    }
    await afterCharge(data);
  }

  async function paySaved(cardId) {
    setBusy(true);
    setMessage('');
    const { data } = await supabase.functions.invoke('billing', {
      body: { action: 'charge_saved', plan_id: plan.id, card_id: cardId },
    });
    setBusy(false);
    await afterCharge(data);
  }

  async function sendExtra() {
    setBusy(true);
    setMessage('');
    const { data } = await supabase.functions.invoke('billing', {
      body: {
        action: step === 'send_pin' ? 'submit_pin' : 'submit_otp',
        plan_id: plan.id,
        reference,
        purchase_id: purchaseId,
        value: extra,
      },
    });
    setBusy(false);
    await afterCharge(data);
  }

  async function remove(cardId) {
    setBusy(true);
    const { data } = await supabase.functions.invoke('billing', { body: { action: 'remove', card_id: cardId } });
    setBusy(false);
    setCards(data?.cards || []);
    setMessage('Card removed. We emailed you about the next renewal.');
  }

  const brand = brandOf(number);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Pay" back />
      <Text style={styles.plan}>{plan.name}</Text>
      <Text style={styles.price}>{naira ? plan.ngn : plan.usd}</Text>
      <Text style={styles.period}>{plan.period}</Text>
      {cards.map((card) => (
        <View key={card.id} style={styles.saved}>
          <View style={styles.copy}>
            <Text style={styles.brand}>{card.brand || 'Card'} ···· {card.last4}</Text>
            <Text style={styles.meta}>{card.exp_month && card.exp_year ? `${card.exp_month}/${card.exp_year}` : 'Saved for renewal'}</Text>
          </View>
          <Pressable onPress={() => paySaved(card.id)} disabled={busy} accessibilityLabel="Pay with saved card">
            <Text style={styles.link}>Pay</Text>
          </Pressable>
          <Pressable onPress={() => remove(card.id)} disabled={busy} accessibilityLabel="Remove card">
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.label}>Card number</Text>
      <TextInput
        value={number}
        onChangeText={(value) => setNumber(value.replace(/[^\d ]/g, '').slice(0, 23))}
        keyboardType="number-pad"
        placeholder="Visa, Mastercard, Verve, or Amex"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {brand ? <Text style={styles.meta}>{brand}</Text> : null}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Expiry</Text>
          <TextInput
            value={expiry}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, '').slice(0, 4);
              setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
            }}
            keyboardType="number-pad"
            placeholder="MM/YY"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            value={cvv}
            onChangeText={(value) => setCvv(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="123"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
          />
        </View>
      </View>
      {step ? (
        <>
          <Text style={styles.label}>{step === 'send_pin' ? 'Card PIN' : 'Verification code'}</Text>
          <TextInput value={extra} onChangeText={setExtra} keyboardType="number-pad" secureTextEntry style={styles.input} />
        </>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable style={styles.button} onPress={step ? sendExtra : payNew} disabled={busy} accessibilityLabel="Pay">
        <Text style={styles.buttonText}>{busy ? 'Paying' : `Pay ${naira ? plan.ngn : plan.usd}`}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.cancel}>Back to plans</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  plan: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginTop: 8 },
  price: { color: colors.text, fontFamily: font.bold, fontSize: 32, marginTop: 4 },
  period: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginBottom: 16 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  copy: { flex: 1 },
  brand: { color: colors.text, fontFamily: font.semibold, fontSize: 15 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  link: { color: colors.mint, fontFamily: font.semibold, fontSize: 14 },
  remove: { color: colors.amber, fontFamily: font.medium, fontSize: 14 },
  label: { color: colors.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  message: { color: colors.amber, fontFamily: font.regular, fontSize: 14, marginTop: 14 },
  button: {
    marginTop: 18,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 16 },
  cancel: { color: colors.mint, fontFamily: font.medium, textAlign: 'center', marginTop: 16 },
});
