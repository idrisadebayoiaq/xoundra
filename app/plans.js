import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries, plans } from '../src/data/catalogue';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function PlansScreen() {
  const { country, premium } = useApp();
  const current = countries.find((item) => item.code === country) || countries[0];
  const naira = current.currency === 'NGN';

  function checkout(planId) {
    router.push({ pathname: '/pay', params: { plan: planId } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Plans" back />
      <Text style={styles.lead}>
        {premium ? 'You are on Premium.' : 'You are on Free. Premium adds mixes, offline downloads, a sleep timer that starts and stops on a schedule, and the voice guide.'}
      </Text>
      {plans.map((plan) => (
        <View key={plan.id} style={styles.card}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.price}>{naira ? plan.ngn : plan.usd}</Text>
          <Text style={styles.period}>{plan.period}</Text>
          <Pressable style={styles.button} onPress={() => checkout(plan.id)} disabled={premium}>
            <Text style={styles.buttonText}>{premium ? 'Premium active' : 'Continue'}</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.fine}>
        {naira
          ? 'Pay with Visa, Mastercard, Verve, or Amex. A saved card is charged again when the period ends.'
          : 'Pay with Visa, Mastercard, Verve, or Amex. A saved card renews the plan on its own.'}
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
