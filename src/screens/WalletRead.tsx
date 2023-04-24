import * as Linking from "expo-linking";

import { Button, Image, Text } from "react-native";

import { Screen } from "../components/Screen";
import { Section } from "../components/Section";

function LearnMoreLink({ url }: { url: string }) {
  return <Text onPress={() => Linking.openURL(url)}>Learn more</Text>;
}

export function WalletRead() : JSX.Element {
  return (
    <Screen>
      <Section title="Whats in your Wallet?">
        <Text>
        Hello
        </Text>
      </Section>
    </Screen>
  );
}
