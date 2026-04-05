import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { useApp } from '../../store/AppContext.native';
import { 
  HomeIcon, 
  SearchIcon, 
  CameraIcon, 
  UserIcon, 
  PencilAltIcon 
} from '../../components/native/Icons';

export default function TabLayout() {
  const router = useRouter();
  const { notifications, unreadMessageCount } = useApp();
  const unreadNotificationCount = notifications?.filter(n => !n.is_read).length ?? 0;
  const totalBadge = unreadNotificationCount + unreadMessageCount;

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
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <HomeIcon color={color} />
              {totalBadge > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>{totalBadge > 99 ? '99+' : totalBadge}</Text>
                </View>
              )}
            </View>
          ),
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
