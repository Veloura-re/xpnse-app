# Infinite Loop Fix - Maximum Update Depth Exceeded

## 🔴 Error Fixed

```
Uncaught Error: Maximum update depth exceeded. 
This can happen when a component repeatedly calls setState inside 
componentWillUpdate or componentDidUpdate. React limits the number 
of nested updates to prevent infinite loops.
```

## 🐛 Root Cause

The issue was in `app/_layout.tsx` in the `RootLayoutNav` component's `useEffect` hook (lines 22-46).

### The Problem:

1. **useEffect** depends on `[user, isLoading, segments]`
2. Inside the effect, `router.replace()` is called to navigate
3. **Navigation changes the `segments`** (current route)
4. Changed `segments` triggers the **useEffect** again
5. This creates an **infinite loop**

### Specific Scenario:

When a user is not email-verified:
```typescript
if (user && !user.emailVerified) {
  const isVerifyScreen = segments.length > 1 && segments[1] === "verify-email";
  if (!isVerifyScreen) {
    router.replace("/(auth)/verify-email"); // ← This changes segments
  }
}
```

The navigation to `verify-email` changes `segments`, which triggers the effect again, causing infinite redirects.

## ✅ Solution

### 1. **Added Navigation Tracking with useRef**

```typescript
const navigationRef = useRef<string | null>(null);
```

This tracks the last navigation target to prevent duplicate navigations.

### 2. **Determine Target Path First**

Instead of immediately calling `router.replace()`, we first determine where the user should be:

```typescript
let targetPath: string | null = null;

if (user && !user.emailVerified) {
  // Determine target
  targetPath = "/(auth)/verify-email";
} else if (user && user.emailVerified) {
  targetPath = "/(tabs)";
} else if (!user) {
  targetPath = "/(auth)/login";
}
```

### 3. **Navigate Only When Necessary**

Only navigate if:
- We have a target path
- It's different from the last navigation

```typescript
if (targetPath && navigationRef.current !== targetPath) {
  navigationRef.current = targetPath;
  setTimeout(() => {
    router.replace(targetPath as any);
  }, 0);
}
```

### 4. **Use setTimeout to Defer Navigation**

```typescript
setTimeout(() => {
  router.replace(targetPath as any);
}, 0);
```

This defers navigation until after the current render cycle completes, preventing "Cannot update during render" warnings.

## 🔍 Key Changes

### Before (Infinite Loop):
```typescript
useEffect(() => {
  if (isLoading) return;
  
  if (user && !user.emailVerified) {
    const isVerifyScreen = segments[1] === "verify-email";
    if (!isVerifyScreen) {
      router.replace("/(auth)/verify-email"); // ← Immediate navigation
    }
  }
  // ... more immediate navigations
}, [user, isLoading, segments]); // ← segments changes on navigation
```

### After (Fixed):
```typescript
const navigationRef = useRef<string | null>(null);

useEffect(() => {
  if (isLoading) return;
  
  let targetPath: string | null = null;
  
  // Determine target without navigating
  if (user && !user.emailVerified) {
    targetPath = "/(auth)/verify-email";
  }
  
  // Only navigate if needed and different from last
  if (targetPath && navigationRef.current !== targetPath) {
    navigationRef.current = targetPath;
    setTimeout(() => {
      router.replace(targetPath as any);
    }, 0);
  }
}, [user, isLoading, segments]);
```

## 📊 Benefits

1. ✅ **No infinite loops** - Navigation is tracked and prevented from repeating
2. ✅ **Better performance** - Fewer unnecessary navigations
3. ✅ **Cleaner logic** - Separation of "determine target" and "navigate"
4. ✅ **Safer rendering** - setTimeout prevents navigation during render

## 🧪 Testing

After this fix, test these scenarios:

1. **Unverified user login**:
   - Should redirect to verify-email once
   - Should stay on verify-email screen
   - No infinite redirects

2. **Verified user on login page**:
   - Should redirect to tabs once
   - No infinite redirects

3. **Logged out user accessing tabs**:
   - Should redirect to login once
   - No infinite redirects

## 🎯 How to Verify the Fix

1. **Clear app data** or uninstall/reinstall the app
2. **Login with an unverified account**
3. **Check browser console** - should see only ONE redirect log
4. **App should load** without crashing
5. **No "Maximum update depth" error**

## 📝 Additional Notes

### Why useRef?

`useRef` persists across renders but doesn't trigger re-renders when changed. Perfect for tracking navigation state without causing loops.

### Why setTimeout?

React doesn't allow state updates (including navigation) during the render phase. `setTimeout` defers the navigation to the next tick, after rendering is complete.

### Alternative Solutions Considered

1. **Remove segments from dependencies** ❌
   - Would miss navigation changes
   - Navigation wouldn't update properly

2. **Use a separate state variable** ❌
   - Would trigger re-renders
   - Could still cause loops

3. **Use useRef + setTimeout** ✅
   - No re-renders from ref changes
   - Safe navigation timing
   - Prevents duplicate navigations

---

**Status**: ✅ Fixed
**Last Updated**: 2025-11-23
**Files Modified**: `app/_layout.tsx`
