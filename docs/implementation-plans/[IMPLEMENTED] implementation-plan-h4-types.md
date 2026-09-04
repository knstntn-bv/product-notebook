# План исправления H4: типы сущностей из Tables<>

## Обзор

Одни и те же сущности описаны руками на каждой странице. Поля уже не совпадают: у фичи `position` / `closed_at` есть только на Board; Goal на Board/Hypotheses урезан, на Roadmap полный. Хуки H1 уже возвращают `Tables<"…">` (`FeatureRow` и т.д. в `src/lib/productQueries.ts`), страницы сразу кастят в локальный интерфейс — TypeScript врёт, кэш и UI живут на разных контрактах.

Образец, как должно быть: `AttachmentsPage` — `type Attachment = Tables<"attachments">`.

Миграции БД и регенерация `src/integrations/supabase/types.ts` не нужны.

## Проблема

| Сущность | Где свой интерфейс | Чем отличается от Row |
|----------|--------------------|------------------------|
| Feature | Board (полный UI), Hypotheses (черновик создания, без `position`/`closed_at`, `id?`) | Row: `description`/`goal_id`/… это `string \| null`, есть `product_id`, `created_at`. Board кастит `featureRows as Feature[]` |
| Goal | Roadmap (почти полный), Board и Hypotheses (id, goal, initiative_id, archived?) | Row: `quarter: string`, `target_metrics: string[] \| null`, `done: boolean \| null`. Roadmap кастит `goal as Goal` |
| Initiative | ProductContext, Board, Hypotheses; Strategy — inline Partial | Context требует `description: string`, Row даёт `string \| null`; `archived` в Row обязательный boolean |
| Hypothesis | HypothesesPage `extends HypothesisFormValue` | Список мапится из Row в форму **до** таблицы. Форма H3 — отдельный контракт (пустые строки вместо null) |
| Metric / Product | только ProductContext | Metric: `parent_metric_id?` vs `string \| null`. Product: ручной дубль Row |

`HypothesisFormValue` из H3 — это **форма**, не строка БД. Его не удалять.

## Цель

1. Списки и кэш React Query типизировать Row-типами из `productQueries` (они уже = `Tables<>`).
2. Локальные `interface Feature / Goal / Initiative / Hypothesis / Metric / Product` на страницах и в контексте убрать.
3. Черновики диалогов — `Partial<Row>` или уже существующие form-типы (гипотеза, создание фичи).
4. `null` из БД не превращать в `undefined` на всём списке. Коалесцировать в рендере или на границе формы.

## Канон типов

Импорт с одного места, как после H1:

```ts
import type {
  FeatureRow,
  GoalRow,
  HypothesisRow,
  InitiativeRow,
  MetricRow,   // добавить
  ProductRow,  // добавить
} from "@/lib/productQueries";
```

Добавить в `productQueries.ts`:

```ts
export type MetricRow = Tables<"metrics">;
export type ProductRow = Tables<"products">;
```

Страницы не пишут `Tables<"features">` сами, кроме уже существующего Attachments (можно оставить alias или тоже перейти на `AttachmentRow` — по желанию, не обязательно).

| Данные | Тип |
|--------|-----|
| `useFeaturesQuery` / кэш доски | `FeatureRow[]` |
| `useGoalsQuery` / кэш Roadmap | `GoalRow[]` |
| `useHypothesesQuery` | `HypothesisRow[]` |
| `useProduct().initiatives` | `InitiativeRow[]` |
| `useProduct().metrics` | `MetricRow[]` |
| текущий продукт в контексте | `ProductRow \| null` |
| редактор фичи на Board | `Partial<FeatureRow> \| null` |
| редактор цели | `Partial<GoalRow> \| null` |
| редактор инициативы на Strategy | `Partial<InitiativeRow> \| null` |
| редактор гипотезы | `Partial<HypothesisFormValue>` как сейчас |

## UI-проекции (оставить)

Это не дубль Row, а сужение для виджетов. H4 их не размазывает обратно в страничные `interface Feature`.

| Проекция | Где | Зачем |
|----------|-----|--------|
| `HypothesisFormValue` + `HypothesisStatus` | `src/lib/hypotheses.ts` | форма; в БД `status: string`, текстовые поля nullable |
| `ColumnId` | Board / Hypotheses до H5 | в БД `board_column: string` |
| `GoalQuarter` | Roadmap (или `src/lib/goals.ts`) | `"current" \| "next" \| "halfYear"`; в БД `quarter: string` |
| `CreateFeatureInput` | `src/lib/features.ts` | payload создания, не строка кэша |

Хелпер границы гипотезы (в `hypotheses.ts`, без React):

```ts
export function hypothesisRowToForm(row: HypothesisRow): HypothesisFormValue { … }
```

Таблица гипотез читает `HypothesisRow` (status через `hypothesisStatusLabel(row.status)`, priority `row.priority ?? DEFAULT`). В форму — только в `handleEditHypothesis` через хелпер, не маппить весь список.

Черновик «Create Feature from Hypothesis»: не `interface Feature`. Поля как у `CreateFeatureInput` без `productId` / `features` / `initiatives` — локальный тип в том же файле, что mutation, или `Pick`/`Omit` от `CreateFeatureInput`.

## Null vs optional

После смены типа комбобоксы и `if (feature.goal_id)` меняют смысл: `null` и `""` оба falsy, `undefined` в Partial тоже. Правило:

- «нет связи» в стейте редактора = `null` (как в Insert/Update).
- Пункт None в combobox пишет `null`, не стирает ключ в `undefined`.
- Показ: `feature.description ?? ""`, `hypothesis.insight \|\| "Untitled"`.

Не нормализовать весь массив фич в `{ …row, goal_id: row.goal_id ?? undefined }` — это снова локальный тип.

## Вне скоупа

- H5: общий `BOARD_COLUMNS`, сужение `board_column` в типах.
- H7: `.eq("product_id")` на update/delete.
- M7: канон `invalidateQueries` (короткий vs полный ключ).
- M12: второй fetch инициатив — уже снят H1 (`useProduct().initiatives`).
- M1 / `useCrudMutations`.
- Перегенерация `types.ts`, enum’ы в Postgres.
- Values / formula на Strategy, если нет отдельного дубля Row (не в тексте H4).

## Шаг 1. Доэкспорт Row

В `productQueries.ts`: `MetricRow`, `ProductRow`.

`features.ts`: `FeaturePositionSource` / `FeatureInitiativeSource` = `Pick<FeatureRow, "board_column" \| "position">` и `Pick<InitiativeRow, "id" \| "name">`.

`hypothesisRowToForm` в `hypotheses.ts`.

## Шаг 2. ProductContext

Удалить локальные Metric / Initiative / Product.

- `useQuery` продукта: `Promise<ProductRow | null>`, без `as Product`.
- Метрики: тип результата `MetricRow[]`.
- Контекст: `metrics: MetricRow[]`, `initiatives: InitiativeRow[]`.

`ProductContextType` остаётся (это API контекста, не таблица).

Проверка: Strategy/Roadmap/Board/Hypotheses компилятся с `initiative.color` / `description` как `string | null` (`?? ""` в UI, где нужно).

## Шаг 3. Board

Удалить `interface Feature / Goal / Initiative`.

- `const features = featureRows` без `as Feature[]`.
- `editingFeature: Partial<FeatureRow> | null`.
- `originalFeaturesRef: FeatureRow[]`.
- `setQueryData` без смены формы объекта; generic `FeatureRow[]`.
- `SortableFeatureProps.feature: FeatureRow`.
- Select колонки: `value={editingFeature.board_column as ColumnId}` (или сравнение со строкой). `ColumnId` не выносить — H5.
- `goals` / `hypotheses` — `GoalRow[]` / `HypothesisRow[]`. Combobox: `goal.goal`, `hypothesis.insight` с учётом null.

Убрать `updateData: any`, если после Partial<FeatureRow> Update проходит; иначе `TablesUpdate<"features">`.

## Шаг 4. HypothesesPage

Удалить Hypothesis / Feature / Goal / Initiative.

- Таблица и сортировка по `HypothesisRow[]`. `hypothesisStatusOrder[row.status as HypothesisStatus]` (неизвестный статус — в конец / 0, не маппить список).
- `editingHypothesis` по-прежнему form-тип; open → `hypothesisRowToForm`.
- Save/clone по-прежнему шлют поля формы (строки), не сырой Row.
- `creatingFeature` — draft создания, не FeatureRow (нет смысла тащить `position` в этот диалог).
- `features`/`goals` — Row из хуков; `createFeature({ features, initiatives })` уже принимает Pick.

## Шаг 5. Roadmap + Strategy

Roadmap: удалить `interface Goal`. Карточка и DnD — `GoalRow`. `setQueryData<GoalRow[]>`.

Локально (или в `src/lib/goals.ts`):

```ts
export const GOAL_QUARTERS = ["current", "next", "halfYear"] as const;
export type GoalQuarter = (typeof GOAL_QUARTERS)[number];
```

Каст `goal.quarter as GoalQuarter` в фильтре ячейки и в Select — это проекция, не второй Goal.

`createGoal` начальный стейт: `Partial<GoalRow>` с `target_metrics: []`, `done: false`, `archived: false`.

Strategy: `editingInitiative: Partial<InitiativeRow> | null` вместо inline-объекта.

## Шаг 6. Проверка вручную

Поведение не должно измениться, только типы.

1. Strategy: открыть/сохранить инициативу, цвет, archived, priority.
2. Roadmap: карточка цели, drag между ячейками, редактор (quarter, metrics).
3. Board: карточки, drag по колонкам, редактор фичи (goal / initiative / hypothesis None → в БД null), Discover this feature.
4. Hypotheses: таблица (insight null → «No insight»), Edit, Create Feature from Hypothesis.
5. Кэш: Board → Hypotheses и обратно без падений; optimistic drag не ломает типы в runtime (те же поля).

`tsc --noEmit` без новых ошибок в этих файлах. Старые ошибки вне H4 не разгребать, если не задеты.

## Критерий готовности H4

- Grep по `src/pages` и `ProductContext`: нет `interface Feature`, `interface Goal`, `interface Initiative`, `interface Hypothesis`, `interface Metric`, `interface Product`.
- Нет `featureRows as Feature[]` / `goal as Goal`.
- Списки фич/целей/гипотез/инициатив/метрик имеют тип `*Row` из `productQueries`.
- `HypothesisFormValue` живёт только как форма; маппинг Row→form в одном хелпере.

## Оценка

Средний рефакторинг без SQL и без смены UI. Основной риск — `null` в combobox и Partial-стейте (пропавший None, пустой title). Шаги 2–5 можно по файлу; шаг 1 первым. H5 после этого проще: `ColumnId` останется единственным «ручным» enum колонки.

## Сводка по итогам

Сделано. Списки и кэш — `*Row` из `productQueries` (`MetricRow` / `ProductRow` добавлены). Локальные `interface Feature / Goal / Initiative / Hypothesis / Metric / Product` сняты. Форма гипотезы: `hypothesisRowToForm`. Создание фичи с Hypotheses: `CreateFeatureDraft`. Кварталы: `src/lib/goals.ts`. None у гипотезы на Board пишет `hypothesis_id: null`. `ColumnId` оставлен до H5.
