# План исправления M4: один combobox сущностей (+ M19)

## Обзор

Linked Goal и Linked Initiative — один и тот же Popover+Command на Board (редактор фичи) и Hypotheses (Create Feature from Hypothesis): поиск, Check, `ChevronsUpDown`, локальный `open`. На Board третья копия — Linked Hypothesis, плюс пункт None.

H4 выровнял типы (`*Row`, `CreateFeatureDraft`). M3 вынес фильтр archived; алфавит в пикерах остался разный (`localeCompare` с `sensitivity: "base"` на Board, без него на Hypotheses).

Каскад цели → инициативы (M19) есть только на Board: выбор цели подставляет `initiative_id` с этой цели. На Hypotheses ставится только `goal_id`.

Этот план закрывает **M4 и M19**. Миграции не нужны.

## Проблема

| | Board | Hypotheses Create Feature |
|--|-------|---------------------------|
| Goal / Initiative UI | Popover+Command | та же разметка |
| Goal `onSelect` | `goal_id` + `initiative_id` с цели | только `goal_id` |
| Hypothesis | combobox + None | disabled Button (H2), не combobox |
| Сорт пикера | `localeCompare(..., { sensitivity: "base" })` | `localeCompare` без опций |
| `CommandItem value` у гипотезы | `hypothesis.id` (поиск по insight слабый) | — |

Locked Hypothesis на Hypotheses **не** заменять combobox.

Goal и Initiative **без** пункта None (сейчас нельзя сбросить из пикера) — не добавлять.

## Цель

1. Один `EntityCombobox`: items `{ id, label }`, выбранный id, `onSelect`, тексты placeholder/search/empty.
2. Goal, Initiative и Hypothesis на Board плюс Goal/Initiative на Hypotheses — этот компонент.
3. Выбор цели на **обеих** страницах пишет `initiative_id` с выбранной цели (как Board сейчас), в том числе `null`, если у цели нет инициативы.
4. Один алфавитный компаратор для goal/initiative пикеров: как на Board (`sensitivity: "base"`).
5. Поиск гипотезы — по подписи (insight), не по UUID.

`open` держит combobox внутри себя. Страницы снимают `goalOpen` / `initiativeOpen` / `hypothesisOpen`.

## Канон UI

**Файл:** `src/components/EntityCombobox.tsx`

```ts
export type EntityComboboxItem = { id: string; label: string };

type Props = {
  items: EntityComboboxItem[];
  value: string | null | undefined;
  onSelect: (id: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
};
```

Разметка — как сейчас: outline Button `role="combobox"`, `w-full justify-between`, PopoverContent `w-full p-0`, Check по `value === item.id`.

- Trigger: если есть выбранный item — его `label` (пустой label не подменять UUID). Нет выбора — `placeholder`.
- `allowNone`: первая строка, `onSelect(null)`, Check когда `!value`. `noneLabel` по умолчанию `"None"`. Только Linked Hypothesis.
- `CommandItem`: `onSelect` закрывает по `item.id` из замыкания, не по строке cmdk. `value` для фильтра — `label` (и у гипотезы тоже). Дубли подписей допустимы: Check смотрит на `id`.
- `disabled`: как обычная disabled-кнопка (на всякий случай; locked hypothesis на Hypotheses остаётся отдельным Button).

Не знать про Goal/Initiative/Hypothesis внутри компонента.

## Канон каскада (M19)

**Файл:** `src/lib/goals.ts` рядом с `GoalQuarter`:

```ts
export function cascadeInitiativeFromGoal(
  goals: readonly { id: string; initiative_id: string | null }[],
  goalId: string,
): { goal_id: string; initiative_id: string | null } {
  return {
    goal_id: goalId,
    initiative_id: goals.find((goal) => goal.id === goalId)?.initiative_id ?? null,
  };
}
```

Как Board: выбор цели **перезаписывает** инициативу, даже если пользователь уже выбрал другую. Ручной выбор инициативы после цели по-прежнему возможен.

Не класть каскад в `EntityCombobox`.

## Сорт пикеров

После `visibleByArchive(..., false)`:

```ts
(a, b) => (a.goal || "").localeCompare(b.goal || "", undefined, { sensitivity: "base" })
```

и то же для `name` инициатив. Hypotheses перевести на те же опции, что Board.

Список гипотез на Board не сортировать — порядок из `useHypothesesQuery` как сейчас.

## Где вызывать

### Board, rightContent фичи

Три `EntityCombobox`:

| Поле | items | value | onSelect | allowNone |
|------|-------|-------|----------|-----------|
| Goal | `sortedGoals` → `{ id, label: goal }` | `goal_id` | `{ ...cascadeInitiativeFromGoal(goals, id) }` | нет |
| Initiative | `sortedInitiatives` → `{ id, label: name }` | `initiative_id` | только `initiative_id` | нет |
| Hypothesis | `hypotheses` → `{ id, label: insight \|\| "Untitled hypothesis" }` | `hypothesis_id` | `hypothesis_id: id` (`null` из None) | да |

Тексты: `Select goal...` / `Search goals...` / `No goal found.` — как сейчас; hypothesis: `Select hypothesis...` / `Search hypothesis...` / `No hypothesis found.`

Удалить `handleGoalSelect` / `handleInitiativeSelect` / `handleHypothesisSelect`, стейт `*Open`, `getGoalName` / `getInitiativeName` / `getHypothesisName`, если больше нигде не нужны (`getInitiativeColor` оставить — цвет карточки).

### Hypotheses, Create Feature

Goal и Initiative — тот же combobox. Goal `onSelect`: `setCreatingFeature({ ...creatingFeature, ...cascadeInitiativeFromGoal(goals, id) })`.

Locked Hypothesis — без изменений (disabled Button + truncate).

Снять `goalOpen` / `initiativeOpen` и локальные handle/get* если не используются.

Колонка Board (`Select` + `BOARD_COLUMNS`) не трогать.

## Вне скоупа

- M3: `visibleByArchive` уже есть; в combobox не переносить.
- Пункт None у Goal/Initiative.
- Strategy Target Metric (`Select`, не Command).
- Combobox колонки доски.
- Менять H6 (копирование вложений при смене гипотезы) — `onSelect` гипотезы как сейчас пишет в стейт, копирование на Save.
- Общий DnD (M16).

## Документация

`docs/general/hypotheses-page.md`, Create Feature: выбор Linked Goal заполняет Linked Initiative с этой цели (как редактор фичи на Board). Можно перезаписать инициативу вручную.

`docs/general/board-page.md` каскад уже подразумевается поведением доски — не раздувать, если текст не врёт.

## Шаг 1. `EntityCombobox`

Компонент + типы. Без импорта страниц.

## Шаг 2. `cascadeInitiativeFromGoal`

В `goals.ts`. Покрывает M19.

## Шаг 3. Board и Hypotheses

Подставить combobox, выровнять `localeCompare`. Grep `Popover` / `CommandInput` в этих двух страницах: не должно остаться пикеров Goal/Initiative/Hypothesis (кроме disabled Button гипотезы на Hypotheses).

## Шаг 4. Проверка вручную

1. Board: поиск цели и инициативы; Check на выбранном; выбор цели подставляет инициативу цели; потом можно выбрать другую инициативу.
2. Board: Hypothesis — поиск по тексту insight; None → `hypothesis_id` null (как H4); смена гипотезы и Save — копирование вложений как H6.
3. Hypotheses → Create Feature: Goal каскадит инициативу; Hypothesis по-прежнему locked; сохранить фичу.
4. Архивные цели/инициативы в пикерах нет (M3).
5. `npx tsc --noEmit`.

## Критерий готовности M4 (+ M19)

- Разметка Popover+Command для этих пикеров только в `EntityCombobox.tsx`.
- Обе страницы вызывают `cascadeInitiativeFromGoal` при выборе цели.
- Hypotheses больше не оставляет `initiative_id` пустым, если у цели есть инициатива.
- M3 не откатили (`visibleByArchive(..., false)`).

В аудите отметить **M4 и M19**.

## Оценка

Средний UI-рефакторинг, без SQL. Риск — сломать None у гипотезы (`null` vs стереть ключ) или cmdk `onSelect` (брать id из замыкания). Не делать `from(table)`-style хук. Locked hypothesis на Hypotheses не превращать в combobox.

## Сводка по итогам

Сделано. `EntityCombobox` — Goal/Initiative на Board и Hypotheses, Hypothesis + None на Board. `cascadeInitiativeFromGoal` в `goals.ts` (M19). `fallbackLabel` на кнопке, если выбранная сущность не в списке (архив, M3). Locked Hypothesis на Create Feature без изменений. `hypotheses-page.md` описывает каскад.

