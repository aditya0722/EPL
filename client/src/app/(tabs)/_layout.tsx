import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Home, History, Bell, User, Shield, Users, CreditCard, FileText } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const theme = Colors.light;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin ? 'Dashboard' : 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: isAdmin ? 'Payments' : 'Notifications',
          tabBarIcon: ({ color, size }) => isAdmin ? <CreditCard size={size} color={color} /> : <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAdmin ? 'Users' : 'Profile',
          tabBarIcon: ({ color, size }) => isAdmin ? <Users size={size} color={color} /> : <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
