# План исправления L7: EntityDialog без `children`, одна пара Archive/Export

## Обзор

Все вызовы уже `leftContent` / `rightContent`: Strategy (инициатива), Roadmap (цель), Board (фича + Discover), Hypotheses (гипотеза + Create Feature). Проп `children` и ветка `useLegacyLayout` нигде не используются.

Archive и Export скопированы: desktop — низ правой колонки (`mt-auto`), mobile — под stacked-контентом. Delete / Cancel / Save в общем футере — один раз, их не трогать.

Миграции не нужны. Страницы не обязаны меняться, если `children` не передают (сейчас не передают).

## Проблема

| Ветка | Когда | Кто зовёт |
|-------|--------|-----------|
| `useTwoColumn` | desktop + задан left или right | все текущие диалоги |
| `useLegacyLayout` | не two-column **и** есть `children` | никто |
| stacked mobile | иначе | те же диалоги на узком экране |

`leftContent={editingX && (…)}` даёт `false`, не `undefined` — `useTwoColumn` на desktop всё равно true. Поведение не менять.

Две одинаковые кнопки Archive (+ Export только Board). Расходится только обёртка (`mt-auto` на desktop).

## Цель

1. Снять `children` с типа и деструктуризации. Ветку legacy удалить.
2. Archive и Export — один фрагмент, вставить в desktop-правую колонку и в mobile-стек.
3. Two-column vs stacked оставить: сетка `1fr / 0.43fr` и `max-w-6xl` на desktop, столбик на mobile.
4. Футер Delete / Cancel / Save, `saveDisabled`, `onOpenChange` — как сейчас.

Внешний вид и состав кнопок не меняются.

## Канон

```tsx
interface EntityDialogProps {
  // без children
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  // остальное без изменений
}

const useTwoColumn = !isMobile && (leftContent !== undefined || rightContent !== undefined);

const sideActions = (
  <>
    {showArchiveButton && (
      <Button variant="outline" onClick={onArchive} title={archiveButtonLabel}>
        <ArchiveIcon className="h-4 w-4 mr-2" />
        {archiveButtonLabel}
      </Button>
    )}
    {showExportButton && (
      <Button variant="outline" onClick={onExport}>
        {exportLabel}
      </Button>
    )}
  </>
);
```

Desktop: в правой колонке после `rightContent` — `div.flex.flex-col.gap-2.mt-auto.pt-4.border-t` + `{sideActions}`.

Mobile: после `rightContent` — `div.flex.flex-col.gap-2.pt-4.border-t` + `{sideActions}`.

Не переносить Archive в нижний футер (там Delete). Не склеивать desktop/mobile в один `className` в этом пункте, если придётся гадать про overflow: две обёртки контента оставить.

Пустой `sideActions` (нет archive/export): как сейчас, пустой блок с border-t. Не оптимизировать «если нет кнопок — не рисовать div».

## Где менять

- Только `src/components/EntityDialog.tsx`.
- Страницы — только если tsc найдёт `children` (сейчас нет).
- Доки не обязательны: page-doc уже описывают two-column, не `children`. При желании одна фраза в `roadmap-page.md` у EntityDialog: контент только left/right.

Grep `children` в `EntityDialog.tsx` — пусто. `useLegacyLayout` — нет. Вызовы `EntityDialog` без пропа `children`.

## Вне скоупа

- Перенос Archive/Delete в другой футер.
- Менять `max-w-6xl` / пропорции колонок / `min-h-[600px]`.
- `saveDisabled`, M5 confirm delete.
- `onExport` с Board снимать.
- Унифицировать `false` vs `undefined` у `leftContent={x && …}`.

## Шаг 1. Снять legacy

Проп `children`, `useLegacyLayout`, ветка single-column `{children}`.

## Шаг 2. Фрагмент действий

`sideActions` в обеих живых ветках.

## Шаг 3. Проверка вручную

1. Desktop: инициатива / цель / фича / гипотеза — две колонки, Archive справа внизу колонки, Delete слева в футере.
2. Mobile (или узкий viewport): колонки столбиком, Archive над Cancel/Save, не в футере Delete.
3. New Initiative / Add Goal — без Archive/Delete.
4. Board: Export на месте; Discover — без archive.
5. Create Feature с гипотезы — two-column, без archive.
6. `saveDisabled` (невалидный priority) — Save неактивен.
7. `npx tsc --noEmit`.

## Критерий готовности L7

- Нет `children` и legacy-ветки.
- Archive/Export описаны один раз.
- Desktop/mobile раскладка и футер Save/Delete как сейчас.

## Оценка

Точечный рефактор одного компонента. Риск — слить desktop и mobile в один grid и сломать скролл левой колонки. Второй — сунуть Archive в футер к Delete и разъехаться с доками (кнопка в правой колонке).

## Итог

Сделано: `children` и `useLegacyLayout` сняты. Archive/Export — один `sideActions` в desktop-правой колонке (`mt-auto`) и в mobile-стеке. Футер Delete / Cancel / Save без изменений. Страницы не трогали.
