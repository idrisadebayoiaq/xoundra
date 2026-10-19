import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Dropdown } from '../src/components/Dropdown';
import { countries } from '../src/data/catalogue';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function CountryScreen() {
  const { country, setCountry } = useApp();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Country" back />
      <Text style={styles.lead}>
        Nigeria sees naira on Plans. Every other country sees US dollars. Paystack still collects naira.
      </Text>
      <View style={styles.drop}>
        <Dropdown
          label="Country"
          value={country}
          options={countries.map((item) => ({ value: item.code, label: `${item.name} · ${item.currency}` }))}
          onChange={setCountry}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  lead: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  drop: { marginHorizontal: 20 },
});
