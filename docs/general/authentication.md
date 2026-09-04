# Authentication

## Overview

The Authentication page is the entry point for users to access the Product Notebook application. It provides both sign-in and sign-up functionality through a tabbed interface.

## Location

- **Route**: `/auth`
- **Component**: `src/pages/AuthPage.tsx`

## Behavior

### Initial State

- When a user visits the authentication page, the application reads the current user from `AuthProvider` (`useAuth()`)
- If `user` is set, the user is automatically redirected to the main application (`/`)
- The page displays a card with two tabs: "Sign In" and "Sign Up"
- Both tabs render the same `AuthForm` (`mode: "signin" | "signup"`): email, password, and submit. Sign Up uses the password label “Password (min 8 characters)” and `minLength={8}`. Email and password state is shared across tabs.

### Sign In Tab

**Form Fields:**
- **Email**: Required field, validated as a proper email address (max 255 characters)
- **Password**: Required field, minimum 8 characters (max 128 characters)

**Behavior:**
- User enters email and password
- On form submission, credentials are validated with the shared Zod helper (`parseAuthCredentials`)
- If validation passes, attempts to sign in via Supabase authentication
- On success, redirects to the main application (`/`)
- On error, displays a toast notification with the error message
- Shows "Signing in..." state while the request is processing

### Sign Up Tab

**Form Fields:**
- **Email**: Required field, validated as a proper email address (max 255 characters)
- **Password**: Required field, minimum 8 characters (max 128 characters)

**Behavior:**
- User enters email and password
- On form submission, credentials are validated with the shared Zod helper (`parseAuthCredentials`)
- If validation passes, creates a new account via Supabase authentication
- Sends a confirmation email to the user (if email confirmation is enabled)
- On success, displays a success toast indicating the account was created and the user can sign in
- On error, displays a toast notification with the error message
- Shows "Creating account..." state while the request is processing

### Session Management

- Session state lives in `AuthProvider` (`onAuthStateChange` and `getSession` only there)
- AuthPage redirects to `/` when `useAuth().user` is set (already signed in, or a session appears while on `/auth`, e.g. email confirmation)
- Sign In still navigates to `/` after a successful `signInWithPassword`; Sign Up does not redirect unless a session is created

### Error Handling

- All validation errors are displayed via toast notifications
- Email validation ensures proper email format
- Password validation enforces minimum length requirements
- Network and authentication errors are caught and displayed to the user

### User Experience

- Clean, centered card layout with responsive design
- Clear labels and placeholders for form fields
- Loading states prevent multiple submissions
- Smooth transitions between sign-in and sign-up tabs
- Automatic redirects for authenticated users prevent unnecessary page views

