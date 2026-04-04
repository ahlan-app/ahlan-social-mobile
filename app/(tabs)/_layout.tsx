import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { 
  HomeIcon, 
  SearchIcon, 
  CameraIcon, 
  UserIcon, 
  PencilAltIcon 
} from '../../components/native/Icons';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1f2937', // border-gray-800
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color }) => <SearchIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          tabBarIcon: ({ color }) => <CameraIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="compose_dummy"
        options={{
          tabBarIcon: ({ color }) => <PencilAltIcon color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/compose');
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <UserIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
