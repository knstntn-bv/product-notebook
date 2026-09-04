# План исправления M5: один ConfirmDeleteDialog

## Обзор

Пять страниц копируют один AlertDialog: Title, Description, Cancel, Delete с `bg-destructive …`. Меняются только тексты и `onClick`.

H7 на фильтр delete не влиял. EntityDialog по-прежнему только открывает confirm (`onDelete` → `set…Open(true)`).

Миграции не нужны. Тексты предупреждений не менять.

## Проблема

| Страница | open | Описание | Confirm |
|----------|------|----------|---------|
| Strategy | `deleteInitiativeAlertOpen` | this initiative | mutate + явно `setOpen(false)` |
| Roadmap | `deleteAlertOpen` | this goal | mutate, если есть `id` |
| Board | то же | this feature | то же |
| Hypotheses | то же | this hypothesis | `confirmDeleteHypothesis` |
| Attachments | `!!attachmentToDelete` | имя файла + «detaches from all…» | `preventDefault`, `disabled={isPending}`, закрытие после успеха мутации |

Cancel везде `"Cancel"`, confirm `"Delete"`, один и тот же destructive className.

Attachments нельзя свести к «клик = закрыть диалог»: удаление storage+row асинхронное, кнопка блокируется на `isPending`.

## Цель

1. Один `ConfirmDeleteDialog`: `open`, `onOpenChange`, `title`, `description`, `onConfirm`.
2. Все пять страниц только передают пропсы.
3. Кнопка Delete — те же классы, что сейчас.
4. Для вложений: не закрывать по клику, `confirmDisabled` на время мутации.

Страницы сами решают, что вызывать в `onConfirm` (mutate). Стейт `open` / `attachmentToDelete` остаётся на странице.

## Канон

**Файл:** `src/components/ConfirmDeleteDialog.tsx`

```ts
type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  closeOnConfirm?: boolean;
};
```

`closeOnConfirm` по умолчанию `true`: в `onClick` confirm — `preventDefault()`, затем `onConfirm()`, затем `onOpenChange(false)`. Так не зависим от дефолта Radix Action (закрытие) и не дублируем `setOpen(false)` как на Strategy.

`closeOnConfirm={false}`: только `preventDefault` + `onConfirm`. Закрытие — как сейчас у вложений: `onSuccess` → `setAttachmentToDelete(null)`.

`description: ReactNode` — строка на четырёх страницах; на Attachments JSX с `display_name`.

Подписи кнопок зашить: Cancel / Delete. Не параметризовать, пока все пять совпадают.

Destructive className один раз в компоненте:

`bg-destructive text-destructive-foreground hover:bg-destructive/90`

Не знать про сущности и supabase.

## Где вызывать

Открыватели (`onDelete` в EntityDialog, иконка на Attachments) не менять.

### Strategy / Roadmap / Board / Hypotheses

```tsx
<ConfirmDeleteDialog
  open={deleteAlertOpen}
  onOpenChange={setDeleteAlertOpen}
  title="Delete Feature" /* Goal / Hypothesis / Initiative */
  description="Are you sure you want to delete this feature? This action cannot be undone."
  onConfirm={() => editingFeature?.id && deleteFeatureMutation.mutate(editingFeature.id)}
/>
```

Strategy: убрать ручной `setDeleteInitiativeAlertOpen(false)` из onClick — его сделает `closeOnConfirm`.

Hypotheses: `onConfirm={confirmDeleteHypothesis}` оставить функцию или инлайн.

### Attachments

```tsx
<ConfirmDeleteDialog
  open={!!attachmentToDelete}
  onOpenChange={(open) => {
    if (!open) setAttachmentToDelete(null);
  }}
  title="Delete Attachment"
  description={
    <>
      Are you sure you want to delete{" "}
      {attachmentToDelete ? `"${attachmentToDelete.display_name}"` : "this file"}? This
      detaches it from all hypotheses and features. This action cannot be undone.
    </>
  }
  onConfirm={() => {
    if (attachmentToDelete) deleteMutation.mutate(attachmentToDelete);
  }}
  confirmDisabled={deleteMutation.isPending}
  closeOnConfirm={false}
/>
```

`onOpenChange` как сейчас: закрытие крестиком/Cancel сбрасывает `attachmentToDelete`.

## Вне скоупа

- M6: toast ошибок.
- M7: ключи invalidate после delete.
- L10: вынести `deleteAttachment` в lib.
- Менять формулировки confirm.
- Confirm для других действий (archive не через AlertDialog).
- `src/components/ui/alert-dialog.tsx` — примитив shadcn, не трогать.

Документы страниц про «Delete cannot be undone» не переписывать: тексты те же.

## Шаг 1. Компонент

`ConfirmDeleteDialog` как выше. Импортирует только ui/alert-dialog и кнопки через него.

## Шаг 2. Пять страниц

Заменить блоки AlertDialog. Снять неиспользуемые импорты примитивов (`AlertDialogTitle` и т.д.), если страница больше их не вызывает.

Grep `AlertDialogTitle` в `src/pages/` — пустой.

## Шаг 3. Проверка вручную

1. Strategy / Roadmap / Board / Hypotheses: Delete в диалоге сущности → confirm → запись исчезает; Cancel оставляет как было.
2. Attachments: confirm с именем файла; Delete неактивен, пока идёт мутация; после успеха диалог закрывается; Cancel не удаляет.
3. Тексты title/description как до рефакторинга.
4. `npx tsc --noEmit`.

## Критерий готовности M5

- Разметка confirm-delete только в `ConfirmDeleteDialog.tsx`.
- Пять вызовов с разными title/description/onConfirm.
- Attachments: `closeOnConfirm={false}` и `confirmDisabled`.
- Поведение удаления без регрессий.

## Оценка

Небольшой UI-слой, без SQL. Риск — закрыть диалог вложений по клику и потерять `isPending`. Не тащить mutate внутрь компонента.

## Сводка по итогам

Сделано. `src/components/ConfirmDeleteDialog.tsx` — пять страниц. Вложения: `closeOnConfirm={false}`, `confirmDisabled` на время мутации. Тексты confirm без изменений.

