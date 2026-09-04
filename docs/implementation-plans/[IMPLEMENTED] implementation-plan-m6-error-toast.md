# План исправления M6: один error-toast

## Обзор

Почти все `useMutation.onError` копируют одно и то же:

```ts
toast({ title: "Error", description: error.message, variant: "destructive" });
```

`error: any`. Values и metrics на Strategy **без** `onError` — ошибка записи проглатывается, соседние initiatives тостят.

Глобальный `QueryCache.onError` не делать: он сработает и на query, и второй раз на мутациях, у которых уже есть handler.

Миграции не нужны. Success-toast не трогать. M18 (Sonner) отдельно.

## Проблема

Одинаковый destructive toast с `title: "Error"` и `error.message`:

- Strategy: formula, delete/archive/save initiative
- Roadmap: save/delete/archive цели; drag — title **«Error moving goal»**
- Board: save/delete фичи, Discover; drag — **«Error moving feature»**
- Hypotheses: save/delete/clone/create feature
- Attachments: upload/delete mutation; download в `catch`
- EntityAttachmentsDialog: три mutation `onError`
- SettingsDialog, AuthPage — тот же объект toast, не `useMutation`

Не этот шаблон (не переписывать на хелпер «как есть»):

| Место | Почему отдельно |
|-------|-----------------|
| Invalid priority (Hypotheses / Board Discover) | другой title и фиксированный текст, не `error.message` |
| Initiative name is required | валидация до mutate |
| Upload по файлу: `` `${file.name}: ${result.message}` `` | не throw, цикл `continue` |
| `mutate(..., { onError })` у DnD | только rollback кэша; toast уже на **определении** мутации |

`useCrudMutations` удалён в M1 — в скоуп не входит.

## Цель

1. `errorMessage(error: unknown)` и `errorToast(error, title?)` в одном модуле. Title по умолчанию `"Error"`.
2. Все mutation `onError`, которые сейчас копируют шаблон, вызывают `errorToast` (кастомный title у drag — вторым аргументом).
3. Values и metrics получают `onError: errorToast` — тихие сбои закрыть.
4. Settings и Auth — тот же хелпер, где сейчас `title: "Error"` + `error.message`.
5. `onError: (error: any)` в этих handler’ах убрать.

Не вешать toast на DnD-rollback callback.

## Канон

**Файл:** `src/lib/errorToast.ts`

Импорт готового `toast` из `@/hooks/use-toast` (экспорт уже есть, без хука).

```ts
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof error === "string" && error.trim()) return error;
  return "Something went wrong";
}

export function errorToast(error: unknown, title = "Error"): void {
  toast({
    title,
    description: errorMessage(error),
    variant: "destructive",
  });
}
```

TanStack Query вызывает `onError(error, variables, context)`. Второй аргумент — variables, не title: в `errorToast` title принимается только если это непустая строка, иначе `"Error"`. Поэтому `onError: errorToast` безопасно.

Drag:

```ts
onError: (error) => errorToast(error, "Error moving feature")
```

то же для goal.

Download:

```ts
catch (error) {
  errorToast(error);
}
```

(`errorMessage` уже даёт fallback вместо `"Download failed"` только если нет message — это приемлемо; при желании `errorToast(error instanceof Error ? error : "Download failed")`.)

Per-file upload оставить явным toast с `${file.name}: …` **или** `errorToast(\`${file.name}: ${result.message}\`)` — второе короче, тот же title Error. Предпочтительно хелпер.

## Где менять

- `StrategyPage`: 4 существующих `onError` + **6** у values/metrics (add/update/delete × 2).
- `RoadmapPage`, `BoardPage`, `HypothesesPage`: mutation-level `onError`.
- `AttachmentsPage`: upload/delete `onError`, `handleDownload`.
- `EntityAttachmentsDialog`: три mutation `onError`; per-file в цикле — через `errorToast(\`…\`)`.
- `SettingsDialog.handleSave`, `AuthPage` sign-in/sign-up ошибки с `title: "Error"`.

Не трогать: invalid priority; initiative name required; DnD `mutate({ onError: rollback })`.

## Вне скоупа

- M7: ключи invalidate.
- M8: `if (!user)`.
- M13: Settings на `useMutation` (только текст ошибки через хелпер).
- M18: убрать Sonner.
- L5: типизировать все `updates: any`; достаточно `unknown` на границе toast.
- QueryClient `mutationCache` / `QueryCache.onError`.
- Менять success-toast и `TOAST_REMOVE_DELAY`.

Документы не нужны: пользовательские тексты Error те же.

## Шаг 1. `src/lib/errorToast.ts`

Две функции. Без React.

## Шаг 2. Заменить копипасту

Страницы и диалоги из списка. Values/metrics — добавить `onError: errorToast`.

Grep `title: "Error", description: error.message` в `src/` — пустой (кроме случайного в docs).

## Шаг 3. Проверка вручную

1. Сохранить инициативу / цель / фичу с оффлайном или заведомой ошибкой — toast Error + message, как сейчас.
2. Drag фичи и цели — title «Error moving …».
3. Values/metrics: сорвать update (нет продукта / сеть) — **появится** toast (раньше молчание).
4. Invalid priority и пустое имя инициативы — прежние тексты, не «Something went wrong».
5. Upload одного плохого файла в цикле — по-прежнему имя файла в description.
6. `npx tsc --noEmit`.

## Критерий готовности M6

- Шаблон `toast({ title: "Error", description: error.message, variant: "destructive" })` собран в `errorToast`.
- Values/metrics больше не без `onError`.
- DnD rollback без второго toast.
- Валидация priority / имени инициативы не через `errorMessage`.

## Оценка

Механическая замена handler’ов + шесть строк на values/metrics. Риск — повесить toast на rollback DnD и получить два уведомления; в шаге 2 этого не делать. Не тащить глобальный QueryCache.

## Итог

Сделано: `src/lib/errorToast.ts`, страницы и диалоги из шага 2, values/metrics с `onError: errorToast`. Title у drag прежние. Валидация и DnD rollback не трогали.
