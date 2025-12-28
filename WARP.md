# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Business Finance Management App** built with React Native and Expo. It's a cross-platform mobile application that allows businesses to manage their financial records, books, and entries with role-based access control.

**Key Technologies:**
- React Native with Expo SDK 54
- TypeScript
- Supabase (PostgreSQL database with authentication)
- React Navigation with Expo Router
- TanStack React Query for data fetching
- Zustand for state management
- NativeWind for styling
- Local storage fallback with mock data

## Development Commands

### Essential Commands
```bash
# Start development server with tunnel
npm start

# Start web development with tunnel
npm run start-web

# Start web development with debug logging
npm run start-web-dev

# Run on Android device/emulator
npm run android

# Run on iOS device/simulator  
npm run ios

# Lint the codebase
npm run lint
```

### Build Commands
```bash
# Build for Android (local build)
npm run build:android

# Build Android APK for testing (local build)  
npm run build:android-apk
```

### Testing Individual Components
- Test authentication flows by navigating to `/login` or `/register`
- Test business management by creating/switching businesses
- Test book management within a business context
- Test entry creation and editing within books

## Architecture Overview

### App Structure
The app follows Expo Router's file-based routing with a nested provider architecture:

```
app/
├── _layout.tsx              # Root layout with providers
├── (auth)/                  # Authentication routes
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/                  # Main app with tab navigation
│   ├── index.tsx            # Home/Books view
│   ├── analytics.tsx        # Analytics dashboard
│   ├── activity.tsx         # Activity logs
│   └── settings.tsx         # Settings
├── book/[id].tsx            # Individual book entries
└── business-switcher.tsx    # Business selection modal
```

### Provider Hierarchy
The app uses a nested context provider pattern for state management:

1. **StorageProvider**: Async storage abstraction
2. **ThemeProvider**: Theme and styling context  
3. **SupabaseProvider**: Database client and auth session management
4. **AuthProvider**: User authentication and profile management
5. **BusinessProvider**: Business, books, and entries management

### Data Model
The app manages a hierarchical data structure:

- **User** → **Business** (many-to-many via BusinessMember)
- **Business** → **Book** (one-to-many) 
- **Book** → **BookEntry** (one-to-many)
- **ActivityLog** tracks all entity changes

**User Roles:** `owner`, `partner`, `viewer` with different permissions:
- Owners can manage everything
- Partners can create/edit books and entries
- Viewers can only read data

### Database Schema
The app uses Supabase with comprehensive RLS policies. Key tables:
- `profiles` - User profiles extending Supabase auth
- `businesses` - Business entities with ownership
- `business_members` - Role-based access control
- `books` - Financial books within businesses  
- `book_entries` - Individual transactions
- `activity_logs` - Audit trail for all actions

Database triggers automatically:
- Create user profiles on signup
- Add business owners as members
- Update book totals when entries change

### State Management Strategy
- **Local Development**: Uses mock data with AsyncStorage persistence
- **Production**: Integrates with Supabase for real-time data
- **Offline Support**: Local storage maintains data when offline
- **Role-based UI**: Different interfaces based on user permissions

## Development Notes

### Environment Setup
The app expects these environment variables for Supabase integration:
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY  
```

### Mock Data
For development without Supabase, the app includes comprehensive mock data in `/mocks/data.ts` covering all entity types and relationships.

### Type Safety
All data models are strictly typed in `/types/index.ts`. The app uses TypeScript throughout with path aliases (`@/*` maps to root).

### Cross-Platform Considerations
- Uses Expo's cross-platform APIs for consistent behavior
- NativeWind provides responsive styling
- Haptic feedback on supported platforms
- Platform-specific navigation patterns

### Testing Strategy
- Individual component testing via direct navigation
- Role-based testing by switching user contexts
- Data persistence testing across app restarts
- Cross-platform testing on web, iOS, and Android

## Architecture Patterns

### Provider Pattern
Each major feature area (auth, business, storage) is encapsulated in a context provider with typed hooks for consumption.

### Repository Pattern  
The BusinessProvider acts as a repository layer, abstracting data access whether from local storage or Supabase.

### Role-Based Access Control
Permissions are enforced at both the provider level and database RLS policies, ensuring consistent security.

### Optimistic Updates
UI updates immediately while background sync ensures data consistency.