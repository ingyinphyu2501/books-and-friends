import React from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { AuthScreen } from './src/screens/AuthScreen'
import { SessionsListPage } from './src/screens/SessionsListPage'
import { SessionDetailScreen } from './src/screens/SessionDetailScreen'
import { DiscussionScreen } from './src/screens/DiscussionScreen'
import { ProfileScreen } from './src/screens/ProfileScreen'
import { CreateSessionScreen } from './src/screens/CreateSessionScreen'
import { Book, User, PlusCircle } from 'lucide-react-native'

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f6f1ea',
    primary: '#2f6f5e',
    text: '#1f1b16',
    card: '#fffdf8',
    border: '#d7cbb9',
  },
}

function SessionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fffdf8', borderBottomColor: '#d7cbb9' },
        headerTitleStyle: { fontFamily: 'serif', fontWeight: '600', color: '#1f1b16' },
        headerTintColor: '#2f6f5e',
      }}
    >
      <Stack.Screen name="Sessions" component={SessionsListPage} options={{ title: 'Books & Friends' }} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Reading Session' }} />
      <Stack.Screen name="Discussion" component={DiscussionScreen} options={{ title: 'Discussion' }} />
      <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{ title: 'New Session' }} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2f6f5e',
        tabBarInactiveTintColor: '#5c5348',
        tabBarStyle: { backgroundColor: '#fffdf8', borderTopColor: '#d7cbb9', height: 60, paddingBottom: 8 },
      }}
    >
      <Tab.Screen 
        name="SessionsTab" 
        component={SessionsStack} 
        options={{ 
          title: 'Browse',
          tabBarIcon: ({ color, size }) => <Book color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ 
          title: 'My Profile',
          headerShown: true,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }} 
      />
    </Tab.Navigator>
  )
}

function RootNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2f6f5e" />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={AppTheme}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}
