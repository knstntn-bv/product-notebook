# Authentication

## Overview

The Authentication page is the entry point for users to access the Product Notebook application. It provides both sign-in and sign-up functionality through a tabbed interface.

## Location

- **Route**: `/auth`
- **Component**: `src/pages/AuthPage.tsx`

## Behavior

### Initial State

- When a user visits the authentication page, the application checks if they already have an active session
- If a session exists, the user is automatically redirected to the main application (`/`)
- The page displays a card with two tabs: "Sign In" and "Sign Up"

### Sign In Tab

**Form Fields:**
- **Email**: Required field, validated as a proper email address (max 255 characters)
- **Password**: Required field, minimum 8 characters (max 128 characters)

**Behavior:**
- User enters email and password
- On form submission, the application validates the input using Zod schema
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
- On form submission, the application validates the input using Zod schema
- If validation passes, creates a new account via Supabase authentication
- Sends a confirmation email to the user (if email confirmation is enabled)
- On success, displays a success toast indicating the account was created and the user can sign in
- On error, displays a toast notification with the error message
- Shows "Creating account..." state while the request is processing

### Session Management

- The page listens to Supabase authentication state changes
- If a user becomes authenticated while on this page (e.g., via email confirmation link), they are automatically redirected to the main application
- The page checks for existing sessions on mount and redirects authenticated users

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

