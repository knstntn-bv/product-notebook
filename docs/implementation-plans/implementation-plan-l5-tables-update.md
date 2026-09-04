# План исправления L5: typed `TablesUpdate` вместо `any` в payload

## Обзор

M6 закрыл `error: any` через `errorToast`. H4 / save фичи уже пишут `TablesUpdate<"features">` и `TablesInsert<"features">`. Остались четыре сборки payload через `any`:

| Где | Переменная |
|-----|------------|
| Strategy `updateMetricMutation` | `updates: any` |
| Strategy `saveInitiativeMutation` (ветка update) | `updates: any` |
| Hypotheses `saveHypothesisMutation` (ветка update) | `updates: any` |
| Board `dragFeatureMutation` | `updateData: any` |

Insert инициативы/гипотезы — литералы без `any`, supabase выводит тип. Roadmap save goal — объект без аннотации `any`. Их не раздувать в этот пункт.

Миграции не нужны. Zod на AuthPage не трогать.

## Проблема

Пустой объект + условные поля типизируют как `any`, поэтому в update можно положить опечатку в имени колонки. Канон уже есть на Board save:

```ts
const updateData: TablesUpdate<"features"> = { … };
```

Drag дублирует ту же таблицу через `any` и spread.

## Цель

1. Четыре места — `TablesUpdate<"metrics" | "initiatives" | "hypotheses" | "features">`.
2. Условные поля как сейчас: класть ключ, только если значение `!== undefined` (metrics/initiatives/hypotheses) или есть `board_column` (drag).
3. Drag: `closed_at` только через `applyClosedAt`, только если в этом update есть колонка (M10). Не `as any`.
4. Не менять `errorToast`. Не типизировать insert «заодно».

Поведение записи не меняется.

## Канон

Импорт как у save фичи: `import type { TablesUpdate } from "@/integrations/supabase/types"`.

**Metrics / initiatives / hypotheses** — пустой typed объект, те же `if`:

```ts
const updates: TablesUpdate<"metrics"> = {};
if (name !== undefined) updates.name = name;
if (parent_metric_id !== undefined) updates.parent_metric_id = parent_metric_id || null;
```

Аналогично initiatives (`name`, `description`, `color`, `target_metric_id`, `priority`) и hypotheses (те же поля, что сейчас).

**Drag:**

```ts
const updateData: TablesUpdate<"features"> = {
  position: update.position,
};
if (update.board_column) {
  updateData.board_column = update.board_column;
  updateData.closed_at = applyClosedAt(update.board_column);
}
```

Без `{ ...spread }` в `any`. Reorder в колонке по-прежнему без `board_column` / без `closed_at`.

## Где менять

- `src/pages/StrategyPage.tsx` — metric update, initiative update; импорт `TablesUpdate`.
- `src/pages/HypothesesPage.tsx` — hypothesis update; импорт `TablesUpdate`.
- `src/pages/BoardPage.tsx` — только `dragFeatureMutation` (`TablesUpdate` уже импортирован).

Доки не нужны.

Grep в `src/pages/`: `updates: any`, `updateData: any`, `insertData: any` — пусто. `error: any` в pages — пусто (M6). `src/hooks/useCrudMutations.ts` не трогать (M1, вне скоупа).

## Вне скоупа

- TablesInsert на create инициативы/гипотезы/value.
- Roadmap `.update({…})` без `any` — уже ок.
- Auth Zod, `errorToast`.
- M1 хук.
- Сжимать условные `if` в хелпер `pickDefined`.

## Шаг 1. Strategy

Metrics + initiatives.

## Шаг 2. Hypotheses

Update-ветка save.

## Шаг 3. Board drag

Заменить `any` + spread на `TablesUpdate<"features">` + `if (board_column)`.

## Шаг 4. Проверка вручную

1. Inline-правка имени метрики.
2. Save инициативы (имя, цвет, priority, metric).
3. Save гипотезы.
4. Drag фичи в колонке и в другую (Done → `closed_at`, обратно → null) — как M10.
5. `npx tsc --noEmit`.

## Критерий готовности L5

- В `src/pages/` нет `updates: any` / `updateData: any`.
- Drag без `any`, `closed_at` только через `applyClosedAt` при смене колонки.
- Insert и toast без рефакторинга.

## Оценка

Четыре аннотации по образцу save фичи. Риск — для drag оставить spread в `TablesUpdate` так, что `closed_at` не попадёт в тип (лишние ключи из spread). Явный `if` это снимает. Второй — начать типизировать все insert и раздуть дифф.

## Итог

Сделано: `TablesUpdate<"metrics" | "initiatives" | "hypotheses" | "features">` на четырёх оставшихся update. Drag — явный `if (board_column)` и `applyClosedAt`. Insert и `errorToast` без изменений.
