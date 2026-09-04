# План исправления M7: один способ обновления кэша после мутации

## Обзор

После H1 ключи сущностей уже живут в `src/lib/productQueries.ts` (`featuresKey`, `hypothesesKey`, `goalsKey`, `initiativesKey`). Мутации всё равно бьют кэш по-разному:

- короткий префикс `["features"]` / `["goals"]` / `["hypotheses"]` vs полный `*Key(currentProductId)`;
- `refetchMetrics()` / `refetchInitiatives()` из `ProductContext` vs `invalidateQueries`.

TanStack Query по короткому ключу **находит** полный (`["features"]` матчит `["features", productId]`). В однопродуктовом приложении это почти всегда «работает». Цена — два стиля, лишние refetch в контексте и риск задеть чужой продукт в кэше, если появится второй.

Не заводить `queryKeys.ts`. Канон — фабрики `*Key` в `productQueries`. Миграции не нужны. Оптимистичный DnD (`setQueryData` / `cancelQueries`) уже на полных ключах — не переписывать.

## Проблема

| Место | Сейчас | Сосед на той же странице |
|-------|--------|--------------------------|
| Board save/delete фичи | `["features"]` | drag `onSettled` и Discover — `featuresKey(productId)` |
| Hypotheses save/delete/clone | `["hypotheses"]` | Board Discover — `hypothesesKey(productId)` |
| Hypotheses create feature | `["features"]` | — |
| Roadmap save/delete/archive | `["goals"]` | move `onSettled` — `goalsKey(productId)` |
| Strategy formula / values | `["product_formula"]` / `["values"]` | query уже `["…", currentProductId]` |
| Strategy metrics | `refetchMetrics()` | нет `metricsKey`; fetch только в контексте |
| Strategy initiatives | `refetchInitiatives()` | ключ уже `initiativesKey`, но обновление через refetch хука |

`refetchMetrics` / `refetchInitiatives` экспортируются из контекста, а вызываются **только** со Strategy. `refetchCurrentProduct` и `refetchShowArchived` — не этот пункт (Settings / M13).

Ключи вложений (`feature_attachments`, `hypothesis_attachments`, `attachment_link_flags`) намеренно короткие: query ключ включает `entityId` или список id. Префикс инвалидирует все диалоги. Это не M7.

## Цель

1. После мутации сущности — только `invalidateQueries({ queryKey: *Key(currentProductId) })`.
2. `metricsKey` + `fetchMetrics` + `useMetricsQuery` в `productQueries` (как у инициатив). Контекст перестаёт держать локальный `useQuery` метрик.
3. Снять `refetchMetrics` и `refetchInitiatives` с типа и value `ProductContext`.
4. Formula и values: инвалидировать полным ключом (те же кортежи, что у `useQuery` на Strategy).

Поведение для пользователя то же: активные запросы перезапрашиваются, списки на соседних страницах подтягивают свежие данные.

## Канон

Уже есть:

```ts
export const featuresKey = (productId: string | null) =>
  ["features", productId] as const;
```

Добавить рядом, в том же файле:

```ts
export const metricsKey = (productId: string | null) =>
  ["metrics", productId] as const;

export const valuesKey = (productId: string | null) =>
  ["values", productId] as const;

export const formulaKey = (productId: string | null) =>
  ["product_formula", productId] as const;
```

`fetchMetrics` — текущий `queryFn` из контекста (`select("*")`, `eq("product_id")`, `order("created_at")`). `useMetricsQuery` — как `useInitiativesQuery`.

Инвалидация:

```ts
queryClient.invalidateQueries({ queryKey: featuresKey(currentProductId) });
queryClient.invalidateQueries({ queryKey: metricsKey(currentProductId) });
```

не `refetch*()` и не `queryKey: ["features"]`.

`useMetricsQuery` в контексте: как сейчас, `data = []`, `metricsLoading` в общем `isLoading`.

## Где менять

**`src/lib/productQueries.ts`** — `metricsKey`, `valuesKey`, `formulaKey`, `fetchMetrics`, `useMetricsQuery`.

**`src/contexts/ProductContext.tsx`** — `useMetricsQuery(currentProductId)` вместо локального query; убрать `refetchMetrics` / `refetchInitiatives` из интерфейса и provider.

**`src/pages/StrategyPage.tsx`** — `queryClient` уже есть. Metrics/initiatives: `invalidateQueries` по `metricsKey` / `initiativesKey`. Formula/values: `formulaKey` / `valuesKey`. Query formula/values перевести на те же фабрики (чтобы ключ query и invalidate не разъехались). Снять деструктуризацию refetch.

**`src/pages/BoardPage.tsx`** — save и delete: `featuresKey(currentProductId)` вместо `["features"]`. Discover уже на полных ключах.

**`src/pages/HypothesesPage.tsx`** — save/delete/clone: `hypothesesKey`; create feature: `featuresKey`.

**`src/pages/RoadmapPage.tsx`** — save/delete/archive: `goalsKey`. Move уже так.

Импорты `*Key`, которых на странице ещё нет.

Не трогать: `setQueryData` / `cancelQueries` DnD; короткие ключи вложений; `refetchCurrentProduct`; `setShowArchived` → `refetchShowArchived`.

## Вне скоупа

- M8: `if (!user)`.
- M13: Settings на `useMutation`; `refetchCurrentProduct`.
- M9: цикл upload.
- Новый файл только с ключами (`queryKeys.ts`).
- Хелпер `invalidateProduct(entity)` — лишний слой над однострочными фабриками.
- Перенос formula/values fetch в хуки `useValuesQuery` (один потребитель). Достаточно фабрик ключа.
- Менять `exact: true` / `refetchType` — дефолт invalidate.

Документы страниц не нужны: пользовательский эффект тот же. `strategy-page.md` уже говорит «React Query handles caching» без имён refetch.

## Шаг 1. Ключи и метрики в `productQueries`

`metricsKey` / `fetchMetrics` / `useMetricsQuery`. `valuesKey` и `formulaKey` — только фабрики.

Контекст: хук метрик, без двух refetch в API.

## Шаг 2. Инвалидации на страницах

Заменить короткий ключ и `refetch*` на `*Key(currentProductId)`. Strategy query formula/values — на фабрики.

Grep в `src/`:

- `refetchMetrics` / `refetchInitiatives` — пусто.
- `invalidateQueries({ queryKey: ["features"] })` (и `goals` / `hypotheses` / `values` / `product_formula` / `metrics`) — пусто.
- `["feature_attachments"]` и соседние — **остаются**.

## Шаг 3. Проверка вручную

1. Save/delete фичи на Board — карточка обновляется; Hypotheses видит новую фичу без перезагрузки.
2. Drag фичи / цели — как сейчас (optimistic + invalidate полного ключа).
3. Discover гипотезы — фича и список гипотез свежие.
4. Strategy: правка метрики — список метрик и combobox инициативы (target metric) без F5. Save/archive/delete инициативы — таблица и Roadmap.
5. Formula и values — после save текст на месте, без двойного запроса «не той» записи.
6. Settings: смена имени продукта по-прежнему через `refetchCurrentProduct`.
7. `npx tsc --noEmit`.

## Критерий готовности M7

- Мутации сущностей инвалидируют только `*Key(productId)` из `productQueries`.
- У метрик тот же модуль, что у остальных списков продукта.
- В контексте нет `refetchMetrics` / `refetchInitiatives`.
- DnD rollback и ключи вложений не сломаны.
- Нет `queryKeys.ts`.

## Оценка

Много однострочных замен плюс перенос fetch метрик. Риск — снять refetch из контекста и забыть invalidate на одной из трёх initiative-мутаций; или заменить префикс вложений на `featuresKey`. Шаг 2 grep это ловит.

## Итог

Сделано: `metricsKey` / `valuesKey` / `formulaKey`, `fetchMetrics` + `useMetricsQuery`. Контекст без `refetchMetrics` / `refetchInitiatives`. Страницы инвалидируют `*Key(currentProductId)`. Вложения по-прежнему коротким префиксом.
