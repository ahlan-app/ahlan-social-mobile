import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";

const colors = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899",
];

const getColorForUsername = (username: string): string => {
  if (!username) return "#64748b";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return colors[Math.abs(hash % colors.length)];
};

interface UserAvatarProps {
  username: string | null | undefined;
  avatarUrl: string | null | undefined;
  size?: number;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ username, avatarUrl, size = 40, className }) => {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={200}
      />
    );
  }

  const validUsername = username || "";
  const initial = validUsername?.[0]?.toUpperCase() || "?";
  const color = getColorForUsername(validUsername);
  const fontSize = size * 0.4;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize, color: "#fff", fontWeight: "bold" }}>{initial}</Text>
    </View>
  );
};

export default UserAvatar;
