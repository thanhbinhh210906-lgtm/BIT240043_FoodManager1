// Project: BIT240043_FoodManager
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/context/AppContext';
import DishListScreen from './src/screens/DishListScreen';
import DishDetailScreen from './src/screens/DishDetailScreen';
import DishFormScreen from './src/screens/DishFormScreen';
const Stack = createNativeStackNavigator();
export default function App() {
  return <AppProvider><NavigationContainer><StatusBar style="dark"/><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#F8F3EA' }, headerTintColor: '#493629', headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: '#F8F3EA' } }}>
    <Stack.Screen name="List" component={DishListScreen} options={{ headerShown: false }}/>
    <Stack.Screen name="Detail" component={DishDetailScreen} options={{ title: 'Dish details' }}/>
    <Stack.Screen name="Form" component={DishFormScreen} options={{ title: 'Dish form' }}/>
  </Stack.Navigator></NavigationContainer></AppProvider>;
}
