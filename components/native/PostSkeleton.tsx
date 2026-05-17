// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
