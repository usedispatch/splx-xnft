import * as buffer from "buffer";

import { ActivityIndicator, View } from "react-native";
import { Inter_900Black, useFonts } from "@expo-google-fonts/dev";

import { ExamplesScreens } from "./screens/ExamplesScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { RecoilRoot } from "recoil";
import { Solarplex } from "./screens/Solarplex";
import { TokenListNavigator } from "./screens/TokenNavigator";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { registerRootComponent } from "expo";

window.Buffer = buffer.Buffer;

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: "#e91e63",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={Solarplex}
        options={{
          headerShown: true,
          tabBarLabel: "Wallet",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet" color={color} size={size} />
          ),
        }}
      />
      {/* <Tab.Screen
        name="Examples"
        component={ExamplesScreens}
        options={{
          tabBarLabel: "Examples",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      /> */}
    </Tab.Navigator>
  );
}

function App() {
  let [fontsLoaded] = useFonts({
    Inter_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <RecoilRoot>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </RecoilRoot>
  );
}

export default registerRootComponent(App);
