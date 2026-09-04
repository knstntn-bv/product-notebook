# План исправления M18: убрать мёртвый Sonner

## Обзор

В `App.tsx` рядом стоят два тостера: shadcn `Toaster` (`@/components/ui/toaster` → Radix + `useToast`) и обёртка Sonner. Все уведомления идут в `@/hooks/use-toast` (`toast({ title, description, variant })`), в том числе `errorToast` (M6). `toast` из пакета `sonner` никто не вызывает.

`TOAST_REMOVE_DELAY = 1000000` в `use-toast.ts` — дефолт шаблона shadcn, не баг Sonner. В M18 не менять.

Миграции не нужны.

## Проблема

| Слой | Что делает | Кто зовёт |
|------|------------|-----------|
| `<Toaster />` | рисует очередь `use-toast` | все страницы, диалоги, `errorToast` |
| `<Sonner />` из `ui/sonner.tsx` | портал пакета `sonner`, тема через `next-themes` | **никто** не вызывает `sonner.toast` |
| `next-themes` | `useTheme` только в `sonner.tsx` | `ThemeProvider` в приложении нет |

Два корня в DOM. Второй — мёртвый. Переход «везде на Sonner» — это смена API (`variant: "destructive"` vs `toast.error`) и перепись M6, не уборка мёртвого кода.

## Цель

1. Оставить один тостер: текущий shadcn / `use-toast`.
2. Снять `<Sonner />`, файл `src/components/ui/sonner.tsx`, зависимость `sonner`.
3. Снять `next-themes`, если после удаления обёртки импортов не останется (сейчас только `sonner.tsx`).
4. Не трогать `errorToast`, тексты toast, `TOAST_REMOVE_DELAY`.

Поведение уведомлений не меняется.

## Канон

`App.tsx`:

```tsx
<TooltipProvider>
  <Toaster />
  <BrowserRouter basename={basename}>
```

Импорт только `Toaster` из `@/components/ui/toaster`. Не импортировать `sonner`.

`errorToast` по-прежнему `import { toast } from "@/hooks/use-toast"`.

## Где менять

- `src/App.tsx` — убрать импорт и `<Sonner />`.
- Удалить `src/components/ui/sonner.tsx`.
- `package.json` / lock: `npm uninstall sonner`; затем `next-themes`, если grep `next-themes` / `useTheme` пустой.
- Доки не обязательны: `main-application.md` и так пишет «toast notifications».

Grep `sonner` в `src/` и `package.json` — пустой. `from "sonner"` — нет. `next-themes` — нет, если сняли.

## Вне скоупа

- Переписывать уведомления на `sonner.toast`.
- Менять `TOAST_REMOVE_DELAY`, лимит очереди, внешний вид Radix toast.
- M6 / `errorToast`.
- Чистить остальные неиспользуемые пакеты шаблона shadcn.

## Шаг 1. App и файл обёртки

Снять монтирование. Удалить `sonner.tsx`.

## Шаг 2. Зависимости

`npm uninstall sonner`. Проверить `next-themes`. Не руками править lock без uninstall.

## Шаг 3. Проверка вручную

1. Save / ошибка сети / Invalid priority / Sign in error — как сейчас, один тост, без пустого портала Sonner.
2. Destructive и обычный success на одной сессии.
3. `npx tsc --noEmit`.
4. Grep как выше.

## Критерий готовности M18

- В дереве один `Toaster` (shadcn).
- Пакета `sonner` и файла обёртки нет.
- Все toast по-прежнему через `use-toast` / `errorToast`.

## Оценка

Удаление мёртвого шаблонного куска. Риск — «заодно» мигрировать на Sonner и разъехаться с M6. Второй — оставить `next-themes` висеть без импортов. Не трогать delay: это другой пункт, если понадобится.

## Итог

Сделано: `<Sonner />` снят с `App.tsx`, `src/components/ui/sonner.tsx` удалён. Пакеты `sonner` и `next-themes` сняты. `use-toast` / `errorToast` и `TOAST_REMOVE_DELAY` без изменений.
