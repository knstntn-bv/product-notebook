# План исправления L9: NotFound на токенах темы

## Обзор

`NotFound` — catch-all `path="*"` в `App.tsx`, **вне** `ProtectedRoute` и `AppLayout`. Это единственная страница с palette-классами Tailwind (`bg-gray-100`, `text-gray-600`, `text-blue-500` / `hover:text-blue-700`). Auth (`bg-background`) и layout (`bg-background` / `text-foreground`) уже на семантических токенах. `body` в `index.css` тоже `bg-background text-foreground`; серый фон 404 его перекрывает.

Миграции не нужны. Роутинг, текст, `console.error` — без изменений.

## Проблема

| Элемент | Сейчас | Канон рядом |
|---------|--------|-------------|
| Фон | `bg-gray-100` | Auth: `bg-background`; layout header: `bg-background` |
| Заголовок «404» | без цвета (наследует) | layout: `text-foreground` |
| Подпись | `text-gray-600` | ProtectedRoute / muted-текст: `text-muted-foreground` |
| Ссылка | `text-blue-500 underline hover:text-blue-700` | `text-primary`; hover — `text-primary/80`. Button `variant="link"` в проекте есть, на страницах не используется |

Grep `bg-gray-` / `text-gray-` / `text-blue-` по `src/` — только этот файл.

Ссылка `to="/"` остаётся: залогиненный попадёт в `AppLayout` → `DEFAULT_SECTION_PATH`; гость — `ProtectedRoute` уведёт на `/auth`. Так и сейчас.

## Цель

1. Заменить palette-классы на те же токены, что Auth и layout.
2. Оставить `Link` (не оборачивать в `Button`). Не подключать страницу к `AppLayout`.
3. Не трогать copy, `useLocation` / `console.error`, маршрут `*`.

## Канон

```tsx
<div className="flex min-h-screen items-center justify-center bg-background">
  <div className="text-center">
    <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
    <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
    <Link to="/" className="text-primary underline hover:text-primary/80">
      Return to Home
    </Link>
  </div>
</div>
```

`p-4` как у Auth не обязателен: там отступ под карточку. Здесь контент узкий.

## Где менять

- Только `src/pages/NotFound.tsx`.
- Доки не обязательны: отдельной page-doc для 404 нет.

После правки grep `bg-gray-|text-gray-|text-blue-` в `src/` — пусто.

## Вне скоупа

- Перенос `*` внутрь `ProtectedRoute` / сайдбар на 404.
- Dark-toggle и `next-themes` (M18 снял; `.dark` в CSS есть — токены его подхватят сами).
- `src/components/ui/sonner.tsx` (если ещё жив) и прочий kit.
- L10 (`deleteAttachment`).

## Шаг 1. Классы

Таблица выше → канон. Логика компонента без изменений.

## Шаг 2. Проверка вручную

1. Несуществующий путь (например `/no-such-page`) — фон как у Auth/приложения, не светло-серый patch.
2. «404» читается как обычный заголовок (`text-foreground`); подпись — muted.
3. Ссылка — primary (индиго темы, не `#3B82F6`); hover темнее/прозрачнее, не `blue-700`.
4. Клик «Return to Home»: сессия есть → раздел по умолчанию; нет → `/auth`.
5. `npx tsc --noEmit`.

## Критерий готовности L9

- В `src/` нет `bg-gray-*` / `text-gray-*` / `text-blue-*`.
- 404 визуально на тех же токенах, что Auth и layout.
- Маршрут и тексты те же.

## Оценка

Точечная замена классов в одном файле. Риск — завернуть 404 в layout или сменить `Link` на `Button`, хотя canvas просит те же utility-классы.

## Итог

Сделано: `NotFound` на `bg-background` / `text-foreground` / `text-muted-foreground` / `text-primary`. Маршрут `*`, тексты и `Link to="/"` без изменений.
