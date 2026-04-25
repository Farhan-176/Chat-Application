import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthContext } from '../context/AuthContext'
import { ChatScreen } from '../screens/ChatScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { RoomListScreen } from '../screens/RoomListScreen'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
  Chat: { roomId: string; roomName: string }
}

export type MainTabParamList = {
  Rooms: undefined
  Profile: undefined
}

const RootStack = createNativeStackNavigator<RootStackParamList>()
const MainTabs = createBottomTabNavigator<MainTabParamList>()

function MainTabsNavigator() {
  return (
    <MainTabs.Navigator>
      <MainTabs.Screen name="Rooms" component={RoomListScreen} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} />
    </MainTabs.Navigator>
  )
}

export function AppNavigator() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator>
        {!user ? (
          <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabsNavigator} options={{ headerShown: false }} />
            <RootStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Room Chat' }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}