# План: закрыть открытый «мёртвый код» (L8, L2, L1)

## Обзор

Открытые пункты канваса с типом **«Мёртвый код»**: L8 (реэкспорт toast), L2 (`AutoResizeTextarea`), L1 (неиспользуемые `ui/*` и пакеты шаблона).

План закрывает **L8 + L2 + L1 одним проходом**: удалить, не подключать. UX редакторов и toast не менять.

Миграции не нужны. `zod` оставить (AuthPage). Живой UI-kit (button, dialog, sidebar, toast, …) не трогать.

## Проблема

**L8.** Все импорты — `@/hooks/use-toast`. `src/components/ui/use-toast.ts` только реэкспортирует. `export const reducer` в хуке нужен самому файлу, снаружи не импортируется.

**L2.** `AutoResizeTextarea` есть, длинные поля — обычный `Textarea` + `rows`. Подключать без запроса на UX — лишняя смена поведения. Канвас: удаление дешевле.

**L1.** Снаружи `ui/` не импортируются: accordion, alert (не alert-dialog), aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, collapsible, context-menu, drawer, form, hover-card, input-otp, menubar, navigation-menu, pagination, progress, radio-group, resizable, scroll-area, slider, toggle-group. Плюс `toggle.tsx` — только для toggle-group.

Пакеты, которые после этого никому не нужны: см. канон uninstall. `date-fns` в `src/` уже не импортируется (calendar тянет `react-day-picker`).

Не путать с L3 (SQL-снимки), L7 (`EntityDialog.children` — живой компонент с мёртвым пропом, другой тип).

## Цель

1. L8: удалить `src/components/ui/use-toast.ts`; снять `export` у `reducer` (функция остаётся внутренней).
2. L2: удалить `src/components/AutoResizeTextarea.tsx`. Не подставлять его в диалоги.
3. L1: удалить перечисленные `ui/*.tsx` (и `toggle.tsx`); `npm uninstall` пакетов только из этого списка.
4. Grep пустой; `tsc` зелёный. Поведение приложения то же.

## Канон

### Оставить в `ui/`

`button`, `input`, `textarea`, `label`, `table`, `select`, `card`, `tabs`, `dialog`, `alert-dialog`, `checkbox`, `dropdown-menu`, `popover`, `command`, `badge`, `skeleton`, `sheet`, `separator`, `switch`, `toast`, `toaster`, `tooltip`, `sidebar`.

Они держат: страницы, Entity*, ConfirmDelete, ColorPicker, MetricTagInput, AppLayout/sidebar, `Toaster`.

### Удалить файлы L1 (+ toggle)

`accordion`, `alert`, `aspect-ratio`, `avatar`, `breadcrumb`, `calendar`, `carousel`, `chart`, `collapsible`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `progress`, `radio-group`, `resizable`, `scroll-area`, `slider`, `toggle-group`, `toggle`.

Не удалять `alert-dialog` (ConfirmDelete).

### `npm uninstall` (одним вызовом)

```
@hookform/resolvers
@radix-ui/react-accordion
@radix-ui/react-aspect-ratio
@radix-ui/react-avatar
@radix-ui/react-collapsible
@radix-ui/react-context-menu
@radix-ui/react-hover-card
@radix-ui/react-menubar
@radix-ui/react-navigation-menu
@radix-ui/react-progress
@radix-ui/react-radio-group
@radix-ui/react-scroll-area
@radix-ui/react-slider
@radix-ui/react-toggle
@radix-ui/react-toggle-group
date-fns
embla-carousel-react
input-otp
react-day-picker
react-hook-form
react-resizable-panels
recharts
vaul
```

**Не снимать:** `@radix-ui/react-dialog` (dialog + sheet), `slot`, `toast`, `select`, `dropdown-menu`, `popover`, `tabs`, `checkbox`, `switch`, `separator`, `label`, `tooltip`, `alert-dialog`, `cmdk`, `zod`, dnd-kit, supabase, tanstack, lucide, cva, clsx, tailwind-merge.

Lock только через uninstall, не руками.

## Где менять

- `src/components/ui/use-toast.ts` — удалить (L8).
- `src/hooks/use-toast.ts` — `reducer` без `export`.
- `src/components/AutoResizeTextarea.tsx` — удалить (L2).
- Перечень `ui/*.tsx` выше — удалить (L1).
- `package.json` / lock — uninstall.

Доки продукта не обязаны: UX не меняется. Исторические планы M11 («L2 не сюда») можно не править.

Grep:

- `AutoResizeTextarea` — пусто в `src/`.
- `components/ui/use-toast` — пусто.
- `export const reducer` — нет (остаётся `const reducer` или использование внутри файла).
- Импорты удалённых `ui/accordion` и т.д. — пусто.
- Снятые пакеты — нет в `package.json`.

## Вне скоупа

- Подключать AutoResize к description/insight.
- L3 full_schema, L7 children, L9 NotFound, L4 цвет, L5 `any`, L6 AuthForm, L10 deleteAttachment.
- M1 (`useCrudMutations`) и M18 (Sonner) — уже закрыты своими планами.
- Менять `TOAST_REMOVE_DELAY`.
- Чистить `devDependencies` (eslint, lovable-tagger, …).
- Добавлять компоненты «на будущее».

## Шаг 1. L8 и L2

Реэкспорт toast, `export` у reducer, AutoResizeTextarea. Без npm.

## Шаг 2. L1 файлы

Удалить мёртвые `ui/*.tsx` (включая `toggle.tsx`). Сборку ещё не гонять — пакеты повиснут до шага 3.

## Шаг 3. Зависимости

Один `npm uninstall` со списком канона.

## Шаг 4. Проверка

1. `npx tsc --noEmit`.
2. Grep из «Где менять».
3. Вручную: шапка, диалог сущности, confirm delete, combobox, toast ошибки, sidebar, Auth — как сейчас.
4. Не открывать удалённые примитивы.

## Критерий готовности

- L8, L2, L1 закрыты удалением, не «подключением на всякий случай».
- Живой kit и `zod` на месте.

## Оценка

Механическое удаление. Риск — снести `alert-dialog` вместе с `alert`, или `@radix-ui/react-dialog` вместе с drawer/sheet. Второй — uninstall `zod`. Третий — повесить AutoResize «раз уж чистим». План это запрещает.

## Итог

Сделано: L8 — `ui/use-toast.ts` удалён, `reducer` без export. L2 — `AutoResizeTextarea.tsx` удалён. L1 — мёртвые `ui/*` и связанные пакеты сняты. `alert-dialog`, dialog/sheet, `zod` на месте. `npx tsc --noEmit` прошёл.
