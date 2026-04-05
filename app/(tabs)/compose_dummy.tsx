import { Redirect } from 'expo-router';

// This screen is never shown — tab press is intercepted in _layout.tsx
// and redirects to the /compose modal. This file exists only to satisfy
// expo-router's file-based routing requirement.
export default function ComposeDummy() {
  return <Redirect href="/compose" />;
}
