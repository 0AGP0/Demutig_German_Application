import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from './src/constants/theme';
import { StorageService } from './src/services/StorageService';
import DashboardScreen from './src/screens/DashboardScreen';
import VocabularyScreen from './src/screens/VocabularyScreen';
import SentencesScreen from './src/screens/SentencesScreen';
import CalendarScreen from './src/screens/CalendarScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.backgroundSecondary,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: Colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ 
          tabBarLabel: 'Ana',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Vocabulary"
        component={VocabularyScreen}
        options={{ 
          tabBarLabel: 'Kelimeler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sentences"
        component={SentencesScreen}
        options={{ 
          tabBarLabel: 'Cümleler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Development modunda her açılışta verileri temizle
// Bu flag'i false yaparak devre dışı bırakabilirsiniz
const CLEAR_DATA_ON_START = __DEV__ && true; // Development modunda ve true ise temizle

export default function App() {
  // Development modunda uygulama açılışında verileri temizle
  useEffect(() => {
    if (CLEAR_DATA_ON_START) {
      StorageService.clearAllData().then(() => {
        console.log('✅ Development: Tüm veriler temizlendi (sıfırdan başlıyor)');
      }).catch(err => {
        console.error('❌ Veri temizleme hatası:', err);
      });
    }
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundSecondary} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.backgroundSecondary,
            },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: {
              fontWeight: 'bold',
              color: Colors.textPrimary,
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ 
              title: 'Takvim',
              headerShown: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

