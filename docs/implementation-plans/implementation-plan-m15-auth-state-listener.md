# План исправления M15: один `onAuthStateChange`

## Обзор

Сессию держат два независимых слушателя: `AuthProvider` кладёт `user`/`session` в контекст, `AuthPage` отдельно подписан на тот же `onAuthStateChange` и ещё раз зовёт `getSession`, чтобы редиректить на `/`.

`AuthPage` уже внутри `AuthProvider` (`App.tsx`: `BrowserRouter` → `AuthProvider` → `Routes`, в том числе `/auth`). Второй подписки нет: страница может читать `useAuth()` и уходить с `/auth`, когда `user` есть.

Миграции не нужны. RLS, sign in / sign up, Zod-схема — без изменений.

## Проблема

| | AuthContext | AuthPage сейчас |
|--|-------------|-----------------|
| `onAuthStateChange` | пишет `session` / `user`, `loading = false` | `if (session) navigate("/", { replace: true })` |
| `getSession()` | то же на маунте | то же + редирект, если сессия уже есть |
| Кто ещё редиректит | `signOut` → `/auth` | `handleSignIn` после успеха → `/` |
| Знает ли о контексте | источник `useAuth` | нет, прямой `supabase.auth` |

После логина оба колбэка стреляют. Залогиненный заход на `/auth` делает второй `getSession`. Ссылка подтверждения почты на `/auth` тоже ловится страницей, хотя контекст уже получит ту же сессию.

`ProtectedRoute` смотрит только `useAuth()` и гонит *с* `/` *на* `/auth`. Обратный редирект (уже залогинен → уйти с `/auth`) живёт только на AuthPage. Его нельзя снять «подчистить слушатель и всё»: без него `/auth` останется доступен с живой сессией.

## Цель

1. Единственные `onAuthStateChange` и `getSession` — в `AuthContext`.
2. AuthPage: `useAuth()`, `useEffect` — если есть `user`, `navigate("/", { replace: true })`.
3. `handleSignIn` / `handleSignUp` не переписывать: sign-in по-прежнему `navigate("/")` после успеха; sign-up по-прежнему toast без редиректа (если Supabase сразу выдаст сессию — сработает эффект по `user`).
4. Редирект «уже залогинен» не переносить в `AuthContext` и не дублировать в `ProtectedRoute`.

Поведение для пользователя то же: гость видит форму; сессия есть — `/`; после Sign In — `/`; Sign Up без сессии остаётся на `/auth`.

## Канон

```tsx
const { user } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (user) {
    navigate("/", { replace: true });
  }
}, [user, navigate]);
```

Импорт `supabase` на AuthPage остаётся: `signInWithPassword` / `signUp`. Не вызывать оттуда `onAuthStateChange` / `getSession`.

`AuthContext` не менять (подписка, `getSession`, `signOut` как сейчас). Не добавлять в провайдер `if (user && location === "/auth")`.

## Где менять

- `src/pages/AuthPage.tsx` — снять `useEffect` с подпиской и `getSession`; подключить `useAuth`; эффект редиректа по `user`.
- `docs/general/authentication.md` — Session Management: слушает контекст, не свой `onAuthStateChange`. Initial State: редирект, если `useAuth().user` уже есть.
- `AuthContext.tsx`, `ProtectedRoute.tsx`, `App.tsx` — не трогать.

Grep `onAuthStateChange` и `getSession` в `src/` — только `AuthContext.tsx`. На AuthPage нет прямого слушателя сессии.

## Вне скоупа

- Вынести sign in / sign up в методы контекста.
- Склеить формы Sign in / Sign up (отдельный пункт канваса).
- M18 (второй Toaster / Sonner).
- Менять `ProtectedRoute` (спиннер, редирект на `/auth`).
- Редирект залогиненного с `/auth` внутри `AuthProvider`.
- Ждать `loading` отдельным спиннером на AuthPage — сейчас форма тоже рисуется, пока `getSession` летит; не раздувать UX в этом пункте.

## Шаг 1. AuthPage

`useAuth`. Эффект по `user`. Удалить подписку и `getSession`. Зависимости эффекта: `user`, `navigate`.

## Шаг 2. Дока

`authentication.md`: источник сессии — `AuthProvider`; страница только читает `user`.

## Шаг 3. Проверка вручную

1. Гость на `/auth` — форма, без редиректа.
2. Уже залогинен, открыть `/auth` — сразу `/` (replace, без второй записи в history).
3. Sign In — `/`, приложение как сейчас.
4. Sign Up без авто-сессии — toast, остаёмся на `/auth`.
5. Sign Out с приложения — `/auth`, форма, не сразу обратно на `/`.
6. Защищённый URL без сессии — `ProtectedRoute` на `/auth` (не ломаем).
7. `npx tsc --noEmit`.

## Критерий готовности M15

- `onAuthStateChange` / `getSession` только в `AuthContext`.
- AuthPage редиректит через `useAuth().user`, без своего слушателя.
- Sign in / sign up и `ProtectedRoute` без регрессии.

## Оценка

Маленькая правка одной страницы. Риск — снять редирект совсем и оставить только `handleSignIn.navigate`: тогда уже залогиненный и magic-link на `/auth` застрянут на форме. Второй — повесить редирект на `AuthProvider` и словить цикл с `signOut` → `/auth`. Держать логику на AuthPage, как велит канвас.

## Итог

Сделано: AuthPage редиректит по `useAuth().user`. `onAuthStateChange` и `getSession` только в `AuthContext`. Sign in / sign up и `ProtectedRoute` без изменений.
