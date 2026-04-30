# Ahlan Social

A modern, open-source social media mobile application built with React Native and Expo.

## Features

- **Authentication** — Sign up, login, forgot password (Supabase Auth)
- **Home Feed** — Infinite scrolling feed with stories and posts
- **Search** — Discover users and content
- **Camera** — Built-in camera for capturing photos/videos
- **Compose** — Create new posts with media attachments
- **Comments** — Threaded comment system
- **Direct Messages** — Real-time messaging with Supabase Realtime
- **Push Notifications** — Expo push notifications
- **User Profiles** — View and edit profiles, follow/unfollow
- **Stories** — Create and view ephemeral stories
- **Dark Theme** — Full dark mode UI

## Tech Stack

- **React Native** + **Expo SDK 54**
- **Expo Router** — File-based navigation
- **NativeWind** — Tailwind CSS for React Native
- **Supabase** — Auth, Database, Storage, Realtime
- **TypeScript** — Type-safe codebase

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation

```bash
# Clone the repository
git clone https://github.com/sametyilmaztemel/ahlan-social-mobile.git
cd ahlan-social-mobile

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables

Create a `.env.local` file (see `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Running

```bash
# Start the development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

### Building for Production

```bash
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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with ❤️ by [Samet Yilmaz Temel](https://github.com/sametyilmaztemel)