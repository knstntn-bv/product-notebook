# План исправления L4: один дефолтный цвет инициативы

## Обзор

Дефолт приоритета уже `DEFAULT_INITIATIVE_PRIORITY` в `src/lib/initiatives.ts` (M14). Цвет по-прежнему литерал `#8B5CF6` на Strategy (create/edit/insert, таблица, ColorPicker value), Roadmap (карточка, overlay), Board (`getInitiativeColor`) и в палитре ColorPicker.

В ColorPicker неизвестный `value` падает на **первый** слот палитры (Red `#EF4444`), а не на violet. Создание инициативы и fallback карточек — violet. Пользователь с битым/старым цветом в Select видит Red, карточка — violet.

Миграции не нужны: в БД колонка уже `DEFAULT '#8B5CF6'`. Старые SQL не переписывать.

## Проблема

| Место | Сейчас |
|-------|--------|
| Strategy create / edit / insert / swatch / ColorPicker | `"#8B5CF6"` |
| Roadmap: цвет инициативы у цели, шапка колонки, DragOverlay | то же |
| Board `getInitiativeColor` | то же |
| ColorPicker палитра | слот Violet = `#8B5CF6` |
| ColorPicker fallback | `INITIATIVE_COLORS[0]` = Red |

Литерал и смысл «дефолт инициативы» разъехались с fallback селекта.

## Цель

1. `DEFAULT_INITIATIVE_COLOR = "#8B5CF6"` в `src/lib/initiatives.ts` рядом с приоритетом.
2. Все клиентские `"#8B5CF6"` у инициатив заменить константой.
3. Палитра ColorPicker: слот Violet — `value: DEFAULT_INITIATIVE_COLOR`. Неизвестный value → этот слот, не Red.
4. Docs: default цвет = та же константа / `#8B5CF6`.

Внешний вид новой инициативы и карточек без цвета не меняется.

## Канон

**`src/lib/initiatives.ts`:**

```ts
export const DEFAULT_INITIATIVE_PRIORITY = 3;
export const DEFAULT_INITIATIVE_COLOR = "#8B5CF6";
```

Не класть константу в `ColorPicker.tsx`: домен инициативы, как priority. ColorPicker импортирует её.

**ColorPicker:**

```ts
{ value: DEFAULT_INITIATIVE_COLOR, label: "Violet" }
```

```ts
const current =
  INITIATIVE_COLORS.find((c) => c.value === value) ??
  INITIATIVE_COLORS.find((c) => c.value === DEFAULT_INITIATIVE_COLOR) ??
  INITIATIVE_COLORS[0];
```

**Страницы** — `color: … || DEFAULT_INITIATIVE_COLOR` (пустая строка по-прежнему fallback, как `||` сейчас). Не заводить `initiativeColor()` в этом пункте.

## Где менять

- `src/lib/initiatives.ts` — константа.
- `src/components/ColorPicker.tsx` — слот Violet и fallback.
- `src/pages/StrategyPage.tsx` — все `"#8B5CF6"` (уже импортирует `initiatives`).
- `src/pages/RoadmapPage.tsx` — три fallback.
- `src/pages/BoardPage.tsx` — `getInitiativeColor`.
- `docs/general/strategy-page.md`, `docs/general/data-model.md` — default через константу / hex как у priority.
- Чеклист initiatives: «дефолт = `DEFAULT_INITIATIVE_COLOR` (#8B5CF6)».

Grep `#8B5CF6` в `src/` — только `initiatives.ts`. В SQL baseline / старых миграциях литерал остаётся (DEFAULT колонки).

## Вне скоупа

- Менять набор цветов палитры или сам violet.
- SQL DEFAULT, новые миграции.
- Хелпер `initiativeColor()`.
- Цвета не-инициатив (их нет).

## Шаг 1. Константа

`DEFAULT_INITIATIVE_COLOR` в `initiatives.ts`.

## Шаг 2. ColorPicker и страницы

Слот + fallback; заменить литералы.

## Шаг 3. Доки и grep

strategy-page, data-model, чеклист. Grep `src/`.

## Шаг 4. Проверка вручную

1. New Initiative — ColorPicker Violet, Save — тот же цвет в таблице и на Roadmap/Board.
2. Edit без смены цвета — hex как в БД.
3. Карточка цели / фичи без цвета у инициативы — violet, не red.
4. `npx tsc --noEmit`.

## Критерий готовности L4

- Один литерал `#8B5CF6` в `src/`: `DEFAULT_INITIATIVE_COLOR`.
- ColorPicker при чужом value показывает Violet, не Red.
- SQL не тронут.

## Оценка

Маленькая константа по образцу M14. Риск — оставить fallback ColorPicker на `[0]` и «закрыть» только страницы: селект и карточка снова разъедутся. Второй — переписать DEFAULT в старых миграциях.

## Итог

Сделано: `DEFAULT_INITIATIVE_COLOR` в `initiatives.ts`. Strategy, Roadmap, Board и ColorPicker (слот Violet + fallback) импортируют константу. В `src/` литерал `#8B5CF6` только у неё. SQL не трогали.
