# План исправления L6: одна форма Sign in / Sign up

## Обзор

После M15 редирект по `useAuth().user`. На AuthPage по-прежнему два почти одинаковых `<form>`: email, password, submit. Общие `email` / `password` / `loading` и одна Zod-схема. Расходятся: `onSubmit`, `htmlFor`/id, подпись пароля (`min 8 characters` только на Sign Up), `minLength={8}` на signup, текст кнопки и loading.

Миграции не нужны. `AuthContext`, `ProtectedRoute`, схема Zod — без изменения правил.

## Проблема

| | Sign In | Sign Up |
|--|---------|---------|
| Поля | email + password | то же, те же стейты |
| Parse | `authSchema.safeParse` + первый error | копия |
| API | `signInWithPassword` → `navigate("/")` | `signUp` + toast, редирект только если появится `user` (M15) |
| Password label | `Password` | `Password (min 8 characters)` |
| Button | Sign In / Signing in... | Sign Up / Creating account... |

Два блока JSX и два одинаковых try/parse. Поведение табов верное: общие поля при переключении.

## Цель

1. Один `AuthForm({ mode: "signin" | "signup" })` в том же `AuthPage.tsx` (других потребителей нет — не выносить в `components/`).
2. Один разбор Zod: `parseAuthCredentials(email, password)` кидает `Error` с текстом первого issue, как сейчас.
3. Handlers не сливать в один `if (mode)` на supabase: sign-in и sign-up остаются двумя функциями (разный успех). Обе зовут `parseAuthCredentials`.
4. Tabs, Card, редирект по `user` — как после M15.

Поведение для пользователя то же.

## Канон

```ts
type AuthMode = "signin" | "signup";

function parseAuthCredentials(email: string, password: string) {
  const result = authSchema.safeParse({ email, password });
  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }
  return result.data;
}

function AuthForm({
  mode,
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  mode: AuthMode;
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const isSignUp = mode === "signup";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* ids: `${mode}-email` / `${mode}-password` */}
      {/* signup: Label «Password (min 8 characters)», minLength={8} */}
      {/* button: Sign In / Signing in... vs Sign Up / Creating account... */}
    </form>
  );
}
```

Вкладки:

```tsx
<TabsContent value="signin">
  <AuthForm mode="signin" … onSubmit={handleSignIn} />
</TabsContent>
<TabsContent value="signup">
  <AuthForm mode="signup" … onSubmit={handleSignUp} />
</TabsContent>
```

`handleSignIn` / `handleSignUp`: `preventDefault`, `setLoading`, `parseAuthCredentials`, вызов supabase как сейчас, `errorToast`, `finally`. Не переносить API в контекст.

## Где менять

- `src/pages/AuthPage.tsx` — `AuthForm`, `parseAuthCredentials`, два `TabsContent` без копипасты полей.
- `docs/general/authentication.md` — одна форма, два режима вкладок; поля и тексты кнопок как сейчас.

Grep: второй блок `id="signin-email"` рядом с копией `signup-email` разметки — нет; остаются id через `${mode}-email`. `handleSignIn` и `handleSignUp` оба на месте.

## Вне скоупа

- Стейт email/password по вкладкам раздельно.
- `signIn` / `signUp` в `AuthContext`.
- React Hook Form (пакет снят в L1).
- Менять Zod-лимиты, copy toast, редирект M15.
- Новый файл в `src/components/`.

## Шаг 1. Parse + AuthForm

Хелпер и разметка в `AuthPage.tsx`.

## Шаг 2. Вкладки и handlers

Подставить `AuthForm`. Handlers на `parseAuthCredentials`.

## Шаг 3. Дока и проверка

1. Гость: обе вкладки, общие email/password при переключении.
2. Sign In — `/`. Sign Up без сессии — toast, остаёмся. Уже залогинен на `/auth` — `/` (M15).
3. Невалидный email — toast, как сейчас.
4. `npx tsc --noEmit`.

## Критерий готовности L6

- Одна разметка полей, `mode` задаёт label/id/кнопку.
- Два handler’а с разным успехом, общий parse.
- M15 не откатили.

## Оценка

Локальный JSX-рефактор одной страницы. Риск — общий `loading` на обе кнопки (так и сейчас) «починить» двумя флагами. Второй — один `handleSubmit(mode)` со всеми ветками supabase: план оставляет два handler’а, чтобы успех sign-in/up не смешался.

## Итог

Сделано: `AuthForm` и `parseAuthCredentials` в `AuthPage.tsx`. Два handler’а (Sign In → `/`, Sign Up → toast). Редирект M15 без изменений.
