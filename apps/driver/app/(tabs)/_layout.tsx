import { Tabs } from 'expo-router';

export default function DriverTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#64748b',
        headerStyle: { backgroundColor: '#f8fafc' },
      }}
    >
      <Tabs.Screen name="orders" options={{ title: 'Assigned', tabBarLabel: 'Orders' }} />
      <Tabs.Screen name="route" options={{ title: 'Route map', tabBarLabel: 'Route' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarLabel: 'Earnings' }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarLabel: 'History' }} />
    </Tabs>
  );
}
