# План исправления M13: Settings через `useMutation`, не refetch из контекста

## Обзор

Имя продукта и `show_archived` пишутся императивным `supabase` + `refetch*` из `ProductContext`. Списки сущностей после M7 инвалидируют `*Key`. `setShowArchived` не смотрит `error` select/update/insert — переключатель молча откатывается к старому значению из кэша.

H7 на `products` не ставил `.eq("product_id")`: у строки продукта колонки нет, фильтр — `.eq("id", currentProductId)`. `project_settings` уже пишется по `product_id`.

Миграции не нужны. UNIQUE на `project_settings.product_id` в схеме нет — не переходить на `upsert` вслепую, оставить select → update/insert.

## Проблема

| Запись | Сейчас | Дыра |
|--------|--------|------|
| `SettingsDialog.handleSave` | `update` products → `refetchCurrentProduct()` | `isSaving` вручную; кэш через refetch хука, не invalidate |
| `ProductContext.setShowArchived` | select row → update или insert → `refetchShowArchived()` | ошибки игнорируются; `if (!user)` после M8 |
| Контекст API | `refetchCurrentProduct`, `refetchShowArchived` | после M7 это последние refetch*; снаружи refetchShowArchived никто не зовёт, CurrentProduct — только диалог |

Ключи query уже есть: `["current_product", userId]`, `["project_settings", productId]`. Фабрик в `productQueries` нет.

Switch «Show Archived» controlled: `checked={showArchived}`. Пока мутация не завершилась, UI остаётся на кэше — как сейчас. Optimistic `setQueryData` не делать.

## Цель

1. Save имени — `useMutation`: throw при ошибке, `onError: errorToast`, `onSuccess` — invalidate ключа продукта, toast «Saved», закрыть диалог. `isPending` вместо `isSaving`.
2. `setShowArchived` — `useMutation` в контексте: те же throw, `onError: errorToast`, invalidate ключа settings. Сигнатура `(value: boolean) => void` для Switch.
3. Снять `refetchCurrentProduct` / `refetchShowArchived` с типа и value контекста.
4. Guard записи settings — `requireProductId`, без `if (!user)`.
5. Ключи — фабрики в `productQueries` (канон M7), не новый `queryKeys.ts`.

Поведение при успехе то же: имя в шапке/сайдбаре, архив на Strategy/Roadmap. Новое: ошибка архива — destructive toast.

## Канон

```ts
export const currentProductKey = (userId: string | null | undefined) =>
  ["current_product", userId] as const;

export const projectSettingsKey = (productId: string | null) =>
  ["project_settings", productId] as const;
```

Контекст: `queryKey: currentProductKey(effectiveUserId)` и `projectSettingsKey(currentProductId)` — те же кортежи, что сейчас.

**Имя** (`SettingsDialog`):

```ts
const saveNameMutation = useMutation({
  mutationFn: async (name: string) => {
    const productId = requireProductId(currentProductId);
    const { error } = await supabase.from("products").update({ name }).eq("id", productId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: currentProductKey(userId) });
    toast({ title: "Saved", description: "Product name has been updated." });
    onOpenChange(false);
  },
  onError: errorToast,
});
```

`userId` — `useAuth().user?.id` (как ключ query в контексте) **или** префикс `["current_product"]`. Предпочтительно полный ключ + `useAuth`.

`saveDisabled` / кнопка: `saveNameMutation.isPending`.

**Архив** (контекст): `mutationFn` как сейчас (select, затем update или insert), но:

```ts
if (selectError && selectError.code !== "PGRST116") throw selectError;
if (writeError) throw writeError;
```

`requireProductId(currentProductId)` в начале. `onSuccess`: `invalidateQueries({ queryKey: projectSettingsKey(currentProductId) })`. `onError: errorToast`.

```ts
const setShowArchived = (value: boolean) => {
  setShowArchivedMutation.mutate(value);
};
```

Не ждать Promise в `SidebarToggleButtons`.

## Где менять

- `src/lib/productQueries.ts` — две фабрики ключей.
- `src/contexts/ProductContext.tsx` — `useQueryClient`, мутация архива, ключи, убрать refetch из API и `if (!user)` у записи settings.
- `src/components/SettingsDialog.tsx` — `useMutation` / `useQueryClient`; убрать `refetchCurrentProduct`.
- `SidebarToggleButtons` — без смены API (`setShowArchived(checked)`).

`docs/general/settings.md`: Technical Details — React Query invalidate, не «refetch если used»; ошибка архива через toast. Upsert в тексте поправить: по-прежнему select + update/insert (UNIQUE нет).

## Вне скоупа

- UNIQUE / миграция `project_settings.product_id`.
- Optimistic toggle / success-toast на Switch.
- M15: `onAuthStateChange`.
- Вынести fetch продукта/settings в хуки `useCurrentProductQuery` (достаточно ключей + мутации).
- `.eq("user_id")` на `products` (RLS).
- Перенос Settings в `useMutation` на странице, а не в контексте — архив живёт в контекстном стейте, мутация рядом с query.

## Шаг 1. Ключи

Фабрики + подставить в оба `useQuery` контекста.

## Шаг 2. Мутация архива

Контекст. Grep `refetchShowArchived` в `src/` — пустой.

## Шаг 3. Мутация имени

Диалог. Grep `refetchCurrentProduct` — пустой.

## Шаг 4. Дока settings

Две-три строки Technical Details / Feedback: ошибка архива тоже toast.

## Шаг 5. Проверка вручную

1. Project Settings: валидное имя — toast Saved, диалог закрыт, заголовок обновлён.
2. Имя без изменений / пустое — Save disabled, как сейчас.
3. Сбой сети на Save — errorToast, диалог открыт, имя в шапке старое.
4. Show Archived: вкл/выкл — Strategy/Roadmap как сейчас.
5. Сбой записи архива — toast Error, переключатель на прежнем значении.
6. `npx tsc --noEmit`.

## Критерий готовности M13

- Имя и `show_archived` пишутся через `useMutation` + invalidate канонических ключей.
- В контексте нет `refetchCurrentProduct` / `refetchShowArchived`.
- Ошибка архива не глотается.
- Нет `if (!user)` на этой записи.

## Оценка

Две мутации и снятие refetch с API. Риск — invalidate короткого `["current_product"]` без userId ( tolerabel) или upsert без UNIQUE (не делать). Не добавлять optimistic Switch: controlled-кэш и так совпадёт после invalidate.

## Итог

Сделано: `currentProductKey` / `projectSettingsKey`. Save имени и `setShowArchived` — `useMutation` + invalidate. `refetch*` с контекста сняты. Ошибка архива через `errorToast`. Guard — `requireProductId`.
