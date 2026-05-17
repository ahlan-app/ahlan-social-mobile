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
import { Text, Animated, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../store/AppContext.native";

const ToastItem: React.FC<{ id: string; message: string; type?: "info" | "success" | "error" }> = ({
  id,
  message,
  type = "info",
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const { removeToast } = useApp();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => removeToast(id));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [id, opacity, translateY, removeToast]);

  const bgColor =
    type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-gray-800";

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className={`${bgColor} rounded-xl px-4 py-3 mb-2 shadow-lg`}
    >
      <Pressable onPress={() => removeToast(id)}>
        <Text className="text-white text-sm text-center">{message}</Text>
      </Pressable>
    </Animated.View>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useApp();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <Animated.View
      style={{ position: "absolute", bottom: 80 + insets.bottom, left: 16, right: 16, zIndex: 9999 }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} message={toast.message} type={toast.type} />
      ))}
    </Animated.View>
  );
};

export default ToastContainer;
