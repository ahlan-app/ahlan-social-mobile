import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

const Shimmer: React.FC<{ style?: object; className?: string }> = ({ style, className }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View className={className} style={[{ backgroundColor: "#374151", borderRadius: 8 }, style, { opacity }]} />;
};

const PostSkeleton: React.FC = () => (
  <View className="px-4 py-3 border-b border-gray-800">
    <View className="flex-row items-center mb-3">
      <Shimmer style={{ width: 40, height: 40, borderRadius: 20 }} />
      <View className="ml-3">
        <Shimmer style={{ width: 120, height: 14 }} className="mb-1.5" />
        <Shimmer style={{ width: 80, height: 12 }} />
      </View>
    </View>
    <Shimmer style={{ width: "100%", height: 14 }} className="mb-2" />
    <Shimmer style={{ width: "75%", height: 14 }} className="mb-3" />
    <Shimmer style={{ width: "100%", height: 200, borderRadius: 12 }} className="mb-3" />
    <View className="flex-row justify-between px-2">
      <Shimmer style={{ width: 40, height: 14 }} />
      <Shimmer style={{ width: 40, height: 14 }} />
      <Shimmer style={{ width: 40, height: 14 }} />
    </View>
  </View>
);

export default PostSkeleton;
