import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import SetupScreen from './screens/SetupScreen';
import DashboardScreen from './screens/DashboardScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check SecureStore for session token
      const sessionToken = await SecureStore.getItemAsync('user_session_token');
      
      if (sessionToken) {
        // Token exists - user is authenticated
        console.log('✅ User authenticated with token:', sessionToken);
        setIsAuthenticated(true);
      } else {
        // DEV MODE: Skip QR setup and go directly to Dashboard
        // Remove this block when QR backend is ready
        console.log('🔧 DEV MODE: Skipping QR setup, setting mock credentials');
        await SecureStore.setItemAsync('user_session_token', 'dev-auto-skip-token');
        await SecureStore.setItemAsync('patient_name', 'John Anderson');
        await SecureStore.setItemAsync('caretaker_code', 'DEV123');
        setIsAuthenticated(true);
        
        // PRODUCTION: Uncomment below and remove DEV block above
        // console.log('❌ No session token found - showing setup screen');
        // setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.loadingGradient}
        >
          <Ionicons name="heart-circle" size={80} color="#FFFFFF" />
          <ActivityIndicator 
            size="large" 
            color="#FFFFFF" 
            style={styles.loader} 
          />
          <Text style={styles.loadingText}>Memorii</Text>
          <Text style={styles.loadingSubtext}>Checking authentication...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'Dashboard' : 'Setup'}
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name="Setup" component={SetupScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 24,
  },
  loadingText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 24,
    letterSpacing: 1,
  },
  loadingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
});
