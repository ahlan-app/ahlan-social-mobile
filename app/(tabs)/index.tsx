import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext.native';

export default function HomeFeedScreen() {
  const { refreshAllData } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-2 border-b border-gray-800 flex-row justify-between items-center">
        <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-2xl text-blue-500">
          Ahlan
        </Text>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center mt-20 px-8">
            <Text className="text-gray-400 text-lg text-center">
              Feed will appear here
            </Text>
            <Text className="text-gray-600 text-sm text-center mt-2">
              Follow some users to see their latest posts and stories!
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}
