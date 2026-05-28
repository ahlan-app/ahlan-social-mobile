# Ahlan Social 🔵 

A modern, open-source social media mobile application built with React Native and Expo.

## 🎯 Mission & Vision

The tech world often leaves invisible identities behind. Ahlan Social is built to be a safe, and inclusive digital home. Our mission focuses on:
- Digital Representation: Giving a voice to unrepresented nations cultures and communities.
- Privacy by Design: Putting the user back in control of their personal data.
- Lean Architecture: Optimized for lower bandwidth environments, ensuring high performance across various mobile devices and networking conditions.

## Features

- Authentication — Sign up, login, forgot password (Supabase Auth)
- Home Feed — Infinite scrolling feed with stories and posts
- Search — Discover users and content
- Camera — Built-in camera for capturing photos/videos
- Compose — Create new posts with media attachments
- Comments — Threaded comment system
- Direct Messages — Real-time messaging with Supabase Realtime
- Push Notifications — Expo push notifications
- User Profiles — View and edit profiles, follow/unfollow
- Stories — Create and view ephemeral stories
- Dark Theme — Full dark mode UI

- ## 🛡️ Performance & Privacy Core

- Aggressive Caching & Minimal Fetching: Built following "Lean" development principles to ensure data efficiency and minimal battery drain.
- Image & Media Compression: Advanced image optimization before network uploads to adapt to varying global internet speeds.
- Database-Level Security: Secure access managed via strict Supabase Row Level Security (RLS) policies.
- Future-Proof Roadmap: Planning for decentralized networking and integration with open communication standards like the ActivityPub protocol (Fediverse ecosystem).
- 

## Tech Stack

- React Native + Expo SDK 54
- Expo Router — File-based navigation
- NativeWind — Tailwind CSS for React Native
- Supabase — Auth, Database, Storage, Realtime
- TypeScript — Type-safe codebase.

## Architecture

- Expo Router provides file-based navigation via the app/ directory. Each folder maps to a route segment, with layout files (`_layout.tsx`) controlling navigation containers.
- Supabase handles the entire backend: Auth for user sessions, Database (PostgreSQL) for data, Storage for media uploads, and Realtime for live messaging/notifications.
- NativeWind (Tailwind CSS for React Native) is used throughout for styling — all component classes follow Tailwind conventions.
- AppContext (`store/AppContext.native.tsx`) manages global state (auth session, user profile, feed data) using React Context + hooks.

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation
```
# Clone the repository
git clone https://github.com/ahlan-app/ahlan-social-mobile.git
cd ahlan-social-mobile

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables

All environment variables use the `EXPO_PUBLIC_` prefix, which Expo exposes to client-side code at build time. Copy `.env.example` to `.env.local` and fill in your values:

| Variable | Description | Required |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |

> Note: `EXPO_PUBLIC_SUPABASE_ANON_KEY` is a public key designed for client-side use. It is protected by Supabase Row Level Security (RLS) policies — it does not grant admin access. Never commit your Supabase service role key or `.env.local`.

### Running
```
# Start the development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

### Building for Production
```
# Build with EAS
eas build --platform ios
eas build --platform android
```

## Project Structure
```
ahlan-social-mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation
│   ├── comments/          # Comment threads
│   ├── post/              # Post detail views
│   └── user/              # User profiles
├── components/            # Reusable components
│   ├── native/            # Native-specific components
│   └── screens/           # Screen components
├── services/              # API and business logic
│   ├── apiService.ts      # Supabase API layer
│   └── supabase.native.ts # Supabase client
├── store/                 # State management
│   └── AppContext.native.tsx
├── assets/                # Images, fonts, icons
└── app.json               # Expo configuration
```

## Security

- Supabase anon key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) is a client-side key that is designed to be public. It is protected by Supabase Row Level Security (RLS) policies on the database side — it cannot bypass RLS or access admin operations.
- Never commit `.env.local` or any file containing service role keys, secrets, or private credentials. `.env.local` is gitignored by default.
- If you discover a security vulnerability, please report it via [GitHub Issues](https://github.com/ahlan-app/ahlan-social-mobile/issues) or see [SECURITY.md](SECURITY.md) for responsible disclosure details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up your development environment, creating branches, submitting pull requests, and code style expectations.

## License

Copyright ©️ 2026 Ahlan Social. All rights reserved.

Ahlan Social is licensed under the [Apache License 2.0](LICENSE).

```
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

See [NOTICE](NOTICE) for third-party library attributions.

## Acknowledgments

Built with ❤️
Maintained and managed by [Ahlan Social](https://github.com/ahlan-app) 🔵
