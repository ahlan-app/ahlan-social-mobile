import React from "react";
import { Text, Linking } from "react-native";
import { useRouter } from "expo-router";

interface RenderUserContentProps {
  content: string;
  className?: string;
}

interface Segment {
  type: "text" | "mention" | "link";
  value: string;
}

interface MatchInfo {
  type: "mention" | "link";
  value: string;
  index: number;
  length: number;
}

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const MENTION_PATTERN = /@(\w+)/g;

const RenderUserContent: React.FC<RenderUserContentProps> = ({ content, className }) => {
  const router = useRouter();

  if (!content) return null;

  const segments: Segment[] = [];
  let lastIndex = 0;
  const allMatches: MatchInfo[] = [];

  let match: RegExpExecArray | null;
  const urlRegex = new RegExp(URL_PATTERN.source, "g");
  while ((match = urlRegex.exec(content)) !== null) {
    allMatches.push({ type: "link", value: match[0], index: match.index, length: match[0].length });
  }

  const mentionRegex = new RegExp(MENTION_PATTERN.source, "g");
  while ((match = mentionRegex.exec(content)) !== null) {
    allMatches.push({ type: "mention", value: match[1], index: match.index, length: match[0].length });
  }

  allMatches.sort((a, b) => a.index - b.index);

  for (const m of allMatches) {
    if (m.index < lastIndex) continue;
    if (m.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, m.index) });
    }
    segments.push({ type: m.type, value: m.value });
    lastIndex = m.index + m.length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return (
    <Text className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "mention") {
          return (
            <Text
              key={i}
              className="text-blue-400"
              onPress={() => router.push(`/user/${seg.value}`)}
            >
              @{seg.value}
            </Text>
          );
        }
        if (seg.type === "link") {
          return (
            <Text
              key={i}
              className="text-blue-400 underline"
              onPress={() => Linking.openURL(seg.value)}
            >
              {seg.value}
            </Text>
          );
        }
        return <Text key={i}>{seg.value}</Text>;
      })}
    </Text>
  );
};

export default RenderUserContent;
