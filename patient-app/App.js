/**
 * Memorii Patient App — Entry Point
 *
 * Changes from original:
 * - Swapped Inter → Nunito (warm, rounded font for elderly users)
 * - Added Splash screen as the initial route (handles auth check itself)
 * - Added Restyle ThemeProvider wrapping entire app
 * - Added SafeAreaProvider for useSafeAreaInsets in Toast/OfflineBanner
 * - Added custom Stack transitions per Phase 5 spec
 * - Removed auth check from App.js (SplashScreen handles it)
 */
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as RestyleProvider } from '@shopify/restyle';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

// Restyle themes
import theme from './src/theme/theme';
import darkTheme from './src/theme/darkTheme';

// Legacy ThemeProvider (useTheme hook used throughout app)
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import SetupScreen from './src/screens/SetupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Loading screen (used while fonts load)
import LoadingScreen from './src/components/common/LoadingScreen';

// Storage init — preloads AsyncStorage into memory cache
import { initStorage } from './src/storage';

const Stack = createStackNavigator();

// Stack navigator wrapped inside ThemeProvider so it can read isDarkMode
function AppNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            cardStyle: { backgroundColor: 'transparent' },
          }}
        >
          {/* Splash: fade transition */}
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{
              cardStyleInterpolator: ({ current }) => ({
                cardStyle: { opacity: current.progress },
              }),
            }}
          />

          {/* Setup → Dashboard: fade + slide up */}
          <Stack.Screen
            name="Setup"
            component={SetupScreen}
            options={{
              cardStyleInterpolator: ({ current, next, layouts }) => ({
                cardStyle: {
                  opacity: current.progress,
                  transform: [
                    {
                      translateY: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.height * 0.05, 0],
                      }),
                    },
                  ],
                },
                overlayStyle: { opacity: next ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) : 0 },
              }),
              transitionSpec: {
                open: { animation: 'timing', config: { duration: 300 } },
                close: { animation: 'timing', config: { duration: 250 } },
              },
            }}
          />

          {/* Dashboard: fade */}
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              cardStyleInterpolator: ({ current }) => ({
                cardStyle: { opacity: current.progress },
              }),
              transitionSpec: {
                open: { animation: 'timing', config: { duration: 300 } },
                close: { animation: 'timing', config: { duration: 250 } },
              },
            }}
          />

          {/* Settings: slide from right */}
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
              transitionSpec: {
                open: { animation: 'timing', config: { duration: 250 } },
                close: { animation: 'timing', config: { duration: 200 } },
              },
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  React.useEffect(() => { initStorage(); }, []);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen message="Starting Memorii..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Legacy theme context (useTheme hook + colors) */}
        <ThemeProvider>
          {/* Restyle provider — theme tokens for Box/Text components */}
          <RestyleProvider theme={theme}>
            <AppNavigator />
          </RestyleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
