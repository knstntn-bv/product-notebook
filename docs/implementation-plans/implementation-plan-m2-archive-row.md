# План исправления M2: одна запись архива для цели и инициативы

## Обзор

`archiveGoalMutation` и `archiveInitiativeMutation` копируют один payload: `archived` + `archived_at` (ISO или `null`), затем H7 (`requireProductId`, `.eq("id")` + `.eq("product_id")`). Расходится только таблица и **onSuccess**.

UX после успеха — это M20: у цели toast archive/unarchive и обновление `editingGoal`; у инициативы всегда «archived successfully», `editingInitiative.archived` не меняется — кнопка Unarchive врёт, пока диалог открыт.

Этот план закрывает **M2 и M20 одним изменением**. Не заводить React-хук в духе удалённого `useCrudMutations` (M1): страницы сами инвалидируют кэш и тостят.

Миграции БД не нужны. Поля `archived` / `archived_at` уже есть у `goals` и `initiatives`.

## Проблема

| | Roadmap (`goals`) | Strategy (`initiatives`) |
|--|-------------------|--------------------------|
| Write | одинаковый payload + фильтр продукта | то же |
| Кэш | `invalidateQueries(["goals"])` | `refetchInitiatives()` |
| Toast | archive **или** unarchive | всегда «archived successfully» |
| Диалог | `setEditingGoal` с новым `archived` / `archived_at` | стейт диалога не трогает |

Фильтр списков и combobox (M3) сюда не входят — только **запись** и кнопка в открытом диалоге.

`EntityDialog` уже общий: `onArchive` + `isArchived`. Дубль не в UI кнопки, а в `mutationFn`.

## Цель

1. Один хелпер записи: таблица `"goals" \| "initiatives"`, `id`, `archived`, `productId` → update с тем же payload и фильтром H7.
2. Обе страницы вызывают его из `mutationFn`, не копируют `archived_at`.
3. Strategy как Roadmap: toast по направлению; `setEditingInitiative`, если открыта та же запись (M20).
4. `archived_at` в локальном стейте диалога цели — тот же timestamp, что ушёл в БД, не второй `new Date()`.

Кэш: как сейчас (invalidate целей / refetch инициатив). Выравнивание ключей — M7.

## Канон

**Файл:** `src/lib/archive.ts` (рядом с `goals.ts` / `board.ts`, без React).

```ts
export type ArchiveTable = "goals" | "initiatives";

export function archiveFields(archived: boolean): {
  archived: boolean;
  archived_at: string | null;
} {
  return {
    archived,
    archived_at: archived ? new Date().toISOString() : null,
  };
}

export async function archiveRow(
  table: ArchiveTable,
  id: string,
  archived: boolean,
  productId: string,
): Promise<{ archived: boolean; archived_at: string | null }> {
  const fields = archiveFields(archived);
  const query =
    table === "goals"
      ? supabase.from("goals").update(fields)
      : supabase.from("initiatives").update(fields);
  const { error } = await query.eq("id", id).eq("product_id", productId);
  if (error) throw error;
  return fields;
}
```

Две ветки `from(...)` — чтобы не терять типы Supabase на `from(string)` (тот же аргумент, что в H7 против общего `scopedUpdate`).

Других таблиц с `archived` нет. Фичи не архивируются.

Не делать `useArchiveMutation`: toast, invalidate и `setEditing*` разные; хук снова начнёт обрастать флагами.

## Где вызывать

### Roadmap `archiveGoalMutation`

```ts
mutationFn: async ({ id, archived }) => {
  const productId = requireProductId(currentProductId);
  return archiveRow("goals", id, archived, productId);
},
onSuccess: (fields, variables) => {
  queryClient.invalidateQueries({ queryKey: ["goals"] });
  if (editingGoal?.id === variables.id) {
    setEditingGoal({ ...editingGoal, archived: fields.archived, archived_at: fields.archived_at });
  }
  toast({ title: fields.archived ? "Goal archived successfully" : "Goal unarchived successfully" });
},
```

`onError` как сейчас.

### Strategy `archiveInitiativeMutation`

```ts
mutationFn: async ({ id, archived }) => {
  const productId = requireProductId(currentProductId);
  return archiveRow("initiatives", id, archived, productId);
},
onSuccess: (fields, variables) => {
  refetchInitiatives();
  if (editingInitiative?.id === variables.id) {
    setEditingInitiative({ ...editingInitiative, archived: fields.archived });
  }
  toast({
    title: fields.archived
      ? "Initiative archived successfully"
      : "Initiative unarchived successfully",
  });
},
```

У черновика инициативы нет `archived_at` — для кнопки Archive/Unarchive достаточно `archived`. Не раздувать стейт.

`onArchive` в `EntityDialog` (toggle `!isArchived`) не менять.

## Вне скоупа

- M3: `showArchived`, sort archived в конец, combobox на Board/Hypotheses.
- M5: ConfirmDelete.
- M6: общий error-toast (локальный `onError` оставить).
- M7: `["goals"]` vs `goalsKey`, `refetchInitiatives` vs `initiativesKey`.
- M8: `if (!user)` на других мутациях.
- Архив в `saveGoalMutation` (поля цели при Save) — не трогать.
- `EntityDialog`, настройки `show_archived`.

Документы: `docs/general/strategy-page.md` и `roadmap-page.md` уже описывают Archive/Unarchive. После M20 формулировки совпадут с кодом; отдельно переписывать не нужно, если тексты про кнопку уже верные.

## Шаг 1. `src/lib/archive.ts`

`archiveFields` + `archiveRow`. Без импорта страниц.

## Шаг 2. Roadmap и Strategy

Заменить тело `mutationFn`. Roadmap: `archived_at` в диалоге из возврата хелпера. Strategy: toast + `setEditingInitiative` (M20).

Grep `archived_at = new Date()` / `archived_at = null` в `src/pages/` — только если останется в save цели (это не архив-кнопка).

## Шаг 3. Проверка вручную

1. Roadmap: Archive цели — toast archived, кнопка становится Unarchive без закрытия диалога; Unarchive — обратный toast и кнопка Archive; `archived_at` в БД / при повторном открытии как сейчас.
2. Strategy: то же для инициативы (раньше Unarchive в открытом диалоге врал).
3. При выключенном «Show Archived Items» заархивированная строка/карточка пропадает после рефетча, как сейчас.
4. `npx tsc --noEmit`.

## Критерий готовности M2 (+ M20)

- Payload архива собирается только в `archive.ts`.
- Grep копипасты `updates.archived_at = new Date()` в двух mutationFn пустой.
- Strategy: toast unarchive и живой `isArchived` в открытом диалоге.
- M3/M7 не задеты.

После внедрения в аудите отметить **M2 и M20**.

## Оценка

Небольшой lib + правка двух `onSuccess`. Риск — забыть `setEditingInitiative` и закрыть только M2. Не обобщать на `from(tableName: string)` и не тащить invalidate в хелпер.

## Сводка по итогам

Сделано. `src/lib/archive.ts` — `archiveFields` / `archiveRow`. Roadmap и Strategy вызывают его. M20: toast unarchive и `setEditingInitiative` в открытом диалоге.

