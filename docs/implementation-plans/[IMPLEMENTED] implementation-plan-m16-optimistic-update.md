# План исправления M16: общий optimistic commit в кэш

## Обзор

Board и Roadmap одинаково коммитят drag: `cancelQueries` → снимок → `setQueryData` → `mutate` → rollback в `onError` → `invalidate` в `onSettled`. Разная только доменная раскладка (колонка/`position`/`closed_at` vs `initiative_id`/`quarter`).

После H1 ключи уже фабрики. Общий DnD-хук или общий `handleDragEnd` не нужны: на Board ещё preview в `handleDragOver` и `originalFeaturesRef`, на Roadmap — разбор `cell-` id. Вынести только схему кэша.

Миграции не нужны. M10 уже сделан: в optimistic Board по-прежнему `applyClosedAt`, не копировать `if (isTerminal…)`.

## Проблема

| Шаг | Roadmap `handleDragEnd` | Board `handleDragEnd` (commit) |
|-----|-------------------------|--------------------------------|
| cancel | `goalsKey` | `featuresKey` |
| снимок | `getQueryData` | `originalFeaturesRef` (кэш уже preview с dragOver) |
| next | `map` initiative/quarter | `arrayMove` / пересчёт position + колонка |
| `setQueryData` | сразу | сразу |
| rollback | `mutate({ onError })` | то же, снимок из ref |
| invalidate | `moveGoalMutation.onSettled` | `dragFeatureMutation.onSettled` |

`setQueryData` на Board ещё в `handleDragOver`, cancel drag и «тот же over id» — это preview/revert, не commit. Их в хелпер не класть.

Наивный `applyOptimisticUpdate(queryKey, updater)` с `previous = getQueryData()` на Board откатит **preview**, не состояние на `dragStart`.

## Цель

1. Хелпер: cancel → взять previous → `setQueryData(updater(previous))` → вернуть previous для rollback.
2. Опциональный `previous`: Board передаёт снимок с начала жеста.
3. Rollback — та же пара `queryClient` + ключ + previous, без копипасты `if (previous) setQueryData`.
4. Домен, мутации, `onSettled`, `applyClosedAt`, dnd-kit — на страницах.

Поведение drag не меняется.

## Канон

**Новый файл:** `src/lib/optimisticQuery.ts` (рядом с `errorToast.ts`, не в `board.ts` / `goals.ts` / `productQueries.ts`).

```ts
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function applyOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (previous: T) => T,
  previous: T | undefined = queryClient.getQueryData<T>(queryKey),
): T | undefined {
  void queryClient.cancelQueries({ queryKey });
  if (previous === undefined) return undefined;
  queryClient.setQueryData<T>(queryKey, updater(previous));
  return previous;
}

export function rollbackOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  previous: T | undefined,
): void {
  if (previous === undefined) return;
  queryClient.setQueryData<T>(queryKey, previous);
}
```

`cancelQueries` **без await** — `handleDragEnd` остаётся синхронным, как сейчас.

**Roadmap** (кэш ещё не испорчен preview):

```ts
const previous = applyOptimisticUpdate(queryClient, goalsKey(currentProductId), (goals) =>
  goals.map((goal) =>
    goal.id === activeId
      ? { ...goal, initiative_id: targetInitiativeId, quarter: targetQuarter }
      : goal,
  ),
);
moveGoalMutation.mutate(payload, {
  onError: () => rollbackOptimisticUpdate(queryClient, goalsKey(currentProductId), previous),
});
```

**Board** (четвёртый аргумент — снимок жеста):

```ts
const snapshot =
  originalFeaturesRef.current ??
  queryClient.getQueryData<FeatureRow[]>(featuresKey(currentProductId));
// …как сейчас собрать updatedFeatures из originalFeatures / snapshot…
const previous = applyOptimisticUpdate(
  queryClient,
  featuresKey(currentProductId),
  () => updatedFeatures,
  snapshot,
);
dragFeatureMutation.mutate({ updates }, {
  onError: () =>
    rollbackOptimisticUpdate(queryClient, featuresKey(currentProductId), previous),
});
```

`closed_at` в маппере Board: только `applyClosedAt(update.board_column)` в существующих двух ветках. В хелпер дату не тащить.

`onError` на **определении** мутации по-прежнему только `errorToast` (M6). В колбэке `mutate` — только rollback, без toast.

## Где менять

- `src/lib/optimisticQuery.ts` — две функции.
- `RoadmapPage.handleDragEnd` — commit-ветка (cancel / getQueryData / set / rollback).
- `BoardPage.handleDragEnd` — только блок после расчёта `updatedFeatures`: cancel + set + rollback в `mutate.onError`. Ранние return (`!over`, тот же id, невалидный дроп) и `handleDragOver` / `handleDragCancel` оставляют прямой `setQueryData`.
- `docs/general/board-page.md` и `roadmap-page.md` — одна фраза: optimistic commit через `applyOptimisticUpdate`; preview на Board по-прежнему локальный.

Grep `cancelQueries` в `src/` — только хелпер. `setQueryData` на Roadmap drag — нет (остальной Roadmap не пишет кэш). На Board `setQueryData` остаётся у preview/cancel.

## Вне скоупа

- Общий `DndContext` / один `handleDragEnd`.
- `handleDragOver` через хелпер.
- Перенос `moveGoalMutation` / `dragFeatureMutation` в lib.
- Await `cancelQueries`, async drag handlers.
- Hypotheses и прочий optimistic (если появится) — не этот пункт.
- Менять `applyClosedAt` / M10.

## Шаг 1. Хелпер

Файл + типы `QueryClient` / `QueryKey`.

## Шаг 2. Roadmap, затем Board

Сначала Roadmap (снимок из кэша). Потом Board: передать snapshot с ref, updater возвращает уже посчитанный массив.

## Шаг 3. Доки и grep

Фраза в двух page-doc. Grep как выше.

## Шаг 4. Проверка вручную

1. Roadmap: цель в другую ячейку — сразу на месте; ошибка сети (или откат) — карточка возвращается.
2. Board: reorder в колонке — позиции как сейчас.
3. Board: в другую колонку (на карточку и на пустую) — колонка + `closed_at` как M10 (Done → ISO, обратно → null).
4. Board: dragOver preview, отмена жеста / дроп на себя — исходный порядок, без мутации.
5. После успеха — refetch (`onSettled`), список сходится с сервером.
6. `npx tsc --noEmit`.

## Критерий готовности M16

- Commit DnD на Board и Roadmap идёт через `applyOptimisticUpdate` / `rollbackOptimisticUpdate`.
- Preview и cancel на Board не через хелпер.
- `closed_at` только через `applyClosedAt`.
- Общего канбан/роадмап DnD нет.

## Оценка

Маленький generic вокруг RQ. Риск — скормить Board `getQueryData()` после preview: rollback на промежуточный кэш. Лечится обязательным `previous` с `originalFeaturesRef`. Второй риск — прогнать dragOver через тот же хелпер и отменить in-flight query на каждый pixel; план это запрещает.

## Итог

Сделано: `src/lib/optimisticQuery.ts` — `applyOptimisticUpdate` / `rollbackOptimisticUpdate`. Roadmap и Board commit через хелпер; preview и cancel на Board — прямой `setQueryData`. `closed_at` по-прежнему `applyClosedAt`. `cancelQueries` только в хелпере.
