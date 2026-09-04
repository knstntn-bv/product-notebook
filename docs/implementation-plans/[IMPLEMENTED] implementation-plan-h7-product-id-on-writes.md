# План исправления H7: `product_id` на update/delete

## Обзор

Чтения и insert уже привязаны к текущему продукту: `.eq("product_id", …)` или `product_id` в payload. Update и delete сущностей с колонкой `product_id` фильтруют только `.eq("id", id)`.

RLS не даст править чужой аккаунт, но **не** отделяет продукты одного пользователя. UUID из другого своего продукта (ошибка в id, устаревший кэш, копипаст) сейчас может изменить или удалить строку «не того» продукта. Чтения такого не делают.

Миграции БД не нужны. Политики RLS не менять: это клиентский контракт, тот же, что у select/insert.

## Проблема

| Операция | Контракт сейчас |
|----------|-----------------|
| Select списков | `.eq("product_id", currentProductId)` (`productQueries`, страницы) |
| Insert | `product_id: currentProductId` в payload |
| Update / delete сущностей | только `.eq("id", id)` |
| `useCrudMutations` | insert с `product_id`; update/delete только по `id`. Хук нигде не вызывается (M1), но тот же разрыв |

Итог: `docs/general/main-application.md` уже пишет, что update/delete фильтруются по `product_id`. Код этому не соответствует.

## Цель

1. Каждый update/delete таблицы с колонкой `product_id` дополнительно `.eq("product_id", currentProductId)`.
2. Нет продукта — не писать: `throw new Error("No product selected")`, как на insert.
3. Тот же фильтр в `useCrudMutations` (на будущее; на M1 не переходить).
4. Документ модели данных явно говорит, что **записи** тоже scoped по продукту.

Поведение UI при нормальном id не менять: строка текущего продукта по-прежнему обновляется. Чужой продукт того же пользователя: 0 затронутых строк (PostgREST не ошибка) вместо правки «не той» записи.

## Канон фильтра

После `.eq("id", id)`:

```ts
.eq("product_id", currentProductId)
```

Порядок `id` затем `product_id` — как у чтений не важно; оба равенства обязательны.

Перед вызовом:

```ts
if (!currentProductId) throw new Error("No product selected");
```

Не выносить общий `scopedUpdate(table, …)`: типы Supabase по имени таблицы разъедутся. Повторить две строки на каждом write. При желании один хелпер `requireProductId` в `src/lib/productQueries.ts` — только throw, не цепочка запроса.

Не проверять число затронутых строк и не добавлять `.select()` после update: H7 — совпадение фильтра с чтениями, не новый протокол ошибок.

## Где менять

Все пути ниже — `.from(…).update|delete` + только `.eq("id", …)`.

### Strategy (`StrategyPage.tsx`)

| Мутация | Таблица |
|---------|---------|
| `updateValueMutation` | `values` |
| `deleteValueMutation` | `values` |
| `updateMetricMutation` | `metrics` |
| `deleteMetricMutation` | `metrics` |
| `deleteInitiativeMutation` | `initiatives` |
| `archiveInitiativeMutation` | `initiatives` |
| `saveInitiativeMutation` (ветка с `id`) | `initiatives` |

Insert values/metrics/initiatives и upsert `product_formulas` уже с `product_id` — не трогать.

### Roadmap (`RoadmapPage.tsx`)

| Мутация | Таблица |
|---------|---------|
| `saveGoalMutation` (ветка с `goal.id`) | `goals` |
| `deleteGoalMutation` | `goals` |
| `archiveGoalMutation` | `goals` |
| `moveGoalMutation` | `goals` |

Insert цели уже с `product_id`.

### Board (`BoardPage.tsx`)

| Мутация | Таблица |
|---------|---------|
| `saveFeatureMutation` (ветка с `feature.id`) | `features` |
| `deleteFeatureMutation` | `features` |
| `dragFeatureMutation` (каждый `updates.map`) | `features` |
| `saveHypothesisFromFeatureMutation` (update фичи после insert гипотезы) | `features` |

Insert гипотезы в Discover и `createFeature` уже с `product_id`.

### Hypotheses (`HypothesesPage.tsx`)

| Мутация | Таблица |
|---------|---------|
| `saveHypothesisMutation` (ветка с `hypothesis.id`) | `hypotheses` |
| `deleteHypothesisMutation` | `hypotheses` |

Clone — insert, не update.

### Attachments (`AttachmentsPage.tsx`)

| Мутация | Таблица |
|---------|---------|
| `deleteMutation` | `attachments` (строка в БД; `storage.remove` без изменений) |

### CRUD-хук (`src/hooks/useCrudMutations.ts`)

`updateMutation` и `deleteMutation`: тот же `.eq("product_id", currentProductId)` и throw, если продукта нет (как `addMutation`).

## Вне скоупа

- **M1:** хук удалён (см. `[IMPLEMENTED] implementation-plan-m1-remove-use-crud-mutations.md`). H7 только выравнивал фильтр внутри него.
- **M7:** стиль `invalidateQueries`.
- Таблица `products`: `SettingsDialog` уже `.eq("id", currentProductId)` — у продукта нет `product_id`.
- `project_settings`: `ProductContext.setShowArchived` уже `.eq("product_id", currentProductId)`.
- `product_formulas`: upsert по `product_id`.
- Junction `hypothesis_attachments` / `feature_attachments`: колонки `product_id` нет; RLS через сущность.
- Смена RLS, триггеров, миграций.
- Проверка `count` / ошибка при 0 строках.
- `src/lib/features.ts` (`createFeature` — только insert).

## Шаг 1. Guard + фильтр на страницах

На каждом пути из таблицы выше: throw без `currentProductId`, затем `.eq("product_id", currentProductId)`.

`dragFeatureMutation`: фильтр на **каждом** промисе в `map`, не только на первом.

Где throw уже есть на соседнем insert в той же `mutationFn` (save goal/feature/hypothesis/initiative) — в ветке update тоже проверять: продукт мог пропасть между открытием диалога и Save.

## Шаг 2. `useCrudMutations`

Зеркально шагу 1. `addMutation` не менять.

## Шаг 3. Документация

`docs/general/data-model.md`, Product Context / Data Fetching: не только select. Формулировка в духе: select, insert, update и delete сущностей с `product_id` фильтруются текущим продуктом (update/delete — `.eq("id")` **и** `.eq("product_id")`).

`docs/general/main-application.md` («All data operations … filtered by `product_id`») после H7 станет правдой — текст можно не раздувать.

Страницы Board / Roadmap / Hypotheses / Strategy / Attachments уже говорят, что сущности принадлежат продукту. Отдельные чеклисты не заводить.

## Шаг 4. Проверка

1. Strategy: правка value/metric, archive и delete initiative, save существующей initiative — как сейчас.
2. Roadmap: save / archive / delete цели, drag в другую ячейку.
3. Board: save фичи, delete, drag между колонками, Discover this feature (гипотеза создаётся, фича уходит в Discovery).
4. Hypotheses: save и delete существующей.
5. Attachments: delete файла (storage + строка).
6. Grep: у `.from("values"|"metrics"|"initiatives"|"goals"|"features"|"hypotheses"|"attachments")` цепочки `.update(` / `.delete(` всегда есть `.eq("product_id"` рядом с `.eq("id"`.
7. `npx tsc --noEmit`.

Кросс-продуктовый no-op вручную не обязателен (нет UI переключения продукта в одном жесте). Имеет смысл только если есть два продукта и известный UUID.

## Критерий готовности H7

- Grep `.update(` / `.delete(` по таблицам с `product_id` в `src/pages/` и `useCrudMutations.ts`: нет write только по `id`.
- Исключения из «Вне скоупа» (`products`, `project_settings`, junction, formula upsert) без лишнего `.eq("product_id")` там, где колонки нет.
- `main-application.md` / `data-model.md` согласованы с кодом: записи scoped так же, как чтения.
- Поведение счастливого пути на пяти страницах без регрессий.

## Оценка

Механический проход, без SQL и без нового модуля. Риск — пропустить `dragFeatureMutation` или update фичи в Discover. Шаги 1 и 2 независимы; 3 после кода. M1 потом либо подхватит уже корректный хук, либо удалит его.

## Сводка по итогам

Сделано. `requireProductId` в `src/lib/productQueries.ts`. Update/delete `values`, `metrics`, `initiatives`, `goals`, `features`, `hypotheses`, `attachments` и `useCrudMutations` фильтруют по `id` и `product_id`. `data-model.md` описывает тот же контракт для записей.
