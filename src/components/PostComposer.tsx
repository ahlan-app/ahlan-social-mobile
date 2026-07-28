/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/components/PostComposer.tsx
 *
 * Post composer with periodic draft autosave and a one-tap resume surface on cold start.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, TextInput, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'post:draft';
const AUTOSAVE_INTERVAL_MS = 5000;

interface Draft {
  body: string;
  updatedAt: string;
}

interface Props {
  onPublish: (body: string) => Promise<void>;
}

export function PostComposer({ onPublish }: Props) {
  const [body, setBody] = useState('');
  const [resumed, setResumed] = useState(false);

  // Resume draft on mount
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      try {
        const draft = JSON.parse(raw) as Draft;
        if (draft.body.trim().length > 0) {
          setBody(draft.body);
          setResumed(true);
        }
      } catch {
        // ignore malformed drafts
      }
    })();
  }, []);

  // Periodic autosave
  useEffect(() => {
    const id = setInterval(() => {
      if (body.trim().length === 0) return;
      const draft: Draft = { body, updatedAt: new Date().toISOString() };
      void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [body]);

  const publish = useCallback(async () => {
    await onPublish(body);
    await AsyncStorage.removeItem(DRAFT_KEY);
    setBody('');
    setResumed(false);
  }, [body, onPublish]);

  return (
    <View testID="post-composer">
      {resumed ? <Text testID="post-composer-resumed">Draft resumed</Text> : null}
      <TextInput
        testID="post-composer-input"
        multiline
        value={body}
        onChangeText={setBody}
      />
      <Text testID="post-composer-publish" onPress={publish}>
        Publish
      </Text>
    </View>
  );
}
