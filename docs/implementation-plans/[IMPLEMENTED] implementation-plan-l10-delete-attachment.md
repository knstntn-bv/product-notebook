# План исправления L10: `deleteAttachment` в lib

## Обзор

M9 вынес upload и download в `src/lib/attachments.ts`. Удаление из библиотеки по-прежнему только в `AttachmentsPage.deleteMutation`: `storage.remove`, затем `attachments.delete` с `.eq("id")` и `.eq("product_id")`. В lib `storage.remove` есть лишь как откат неудачного insert в `ensureAttachmentFromFile`.

Диалог сущности (`EntityAttachmentsDialog`) зовёт `detachFromEntity` — отвязывает junction, файл в Storage и строка библиотеки остаются. Так задумано.

Миграции не нужны. CASCADE на `hypothesis_attachments` / `feature_attachments` (attachment_id) уже снимает связи при delete строки. Confirm-текст на странице это уже говорит.

## Проблема

| | Upload / download | Delete |
|--|-------------------|--------|
| Где | `attachments.ts` (`uploadFiles`, `downloadAttachmentFile`) | `AttachmentsPage.tsx` |
| Storage | bucket `ATTACHMENTS_BUCKET` | тот же bucket, инлайн |
| Фильтр строки | insert с `product_id` | `.eq("id").eq("product_id", productId)` (H7) |
| Toast / invalidate | caller | caller (оставить) |

Порядок сейчас: сначала объект в Storage, при ошибке throw; потом строка в БД. Если Storage прошёл, а delete строки нет — блоб без метаданных. Обратный порядок не вводить: поведение не менять.

Junction вручную не чистят: `ON DELETE CASCADE`.

## Цель

1. `deleteAttachment(attachment, productId)` в `attachments.ts` — те же два шага и те же throw.
2. `deleteMutation` на странице: `requireProductId`, затем хелпер. Invalidate, toast «Attachment deleted», confirm — как сейчас.
3. Диалог по-прежнему только `detachFromEntity`. Не добавлять delete файла в попап.

## Канон

```ts
export async function deleteAttachment(
  attachment: { id: string; storage_path: string },
  productId: string,
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([attachment.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachment.id)
    .eq("product_id", productId);
  if (error) throw error;
}
```

Путь брать из `attachment.storage_path`, не собирать заново через `attachmentStoragePath`.

`errorToast` внутрь хелпера не класть: одна операция, ошибка всплывает в `onError` мутации (как download). `uploadFiles` тостит внутри, потому что цикл `continue` по файлам — другой случай.

Страница:

```ts
mutationFn: async (attachment: Attachment) => {
  const productId = requireProductId(currentProductId);
  await deleteAttachment(attachment, productId);
},
```

Снять со страницы импорт `ATTACHMENTS_BUCKET`, если больше не используется. Клиент supabase на странице остаётся (список).

## Где менять

- `src/lib/attachments.ts` — `deleteAttachment`.
- `src/pages/AttachmentsPage.tsx` — тело `deleteMutation`.

`EntityAttachmentsDialog.tsx` и `attachmentLinks.ts` не трогать.

Доки не обязательны: `attachments-page.md` уже описывает Storage + row + CASCADE, без привязки к месту кода.

Grep `storage.from(ATTACHMENTS_BUCKET).remove` в `src/` — только `attachments.ts` (откат insert + delete). `delete()` по таблице `attachments` в страницах — нет.

## Вне скоупа

- Delete из диалога сущности (остаётся detach).
- Компенсация, если Storage удалился, а строка нет (сейчас тоже нет).
- Явный delete junction до строки.
- Общий React-хук upload/delete.
- Менять confirm copy, toast, invalidate.
- RLS / миграции / порядок Storage vs DB.

## Шаг 1. Хелпер

Как канон. Рядом с `downloadAttachmentFile`.

## Шаг 2. Страница

`mutationFn` сводится к guard + вызов. `onSuccess` / `onError` / `ConfirmDeleteDialog` без изменений.

## Шаг 3. Проверка вручную

1. Библиотека: Delete несвязанного файла — строка исчезает, квота падает, toast «Attachment deleted».
2. Файл со значками Hypotheses/Features — confirm про detach; после удаления бейджей нет, в попапе сущности файла нет.
3. Попап гипотезы/фичи: Detach — файл остаётся в библиотеке.
4. Ошибка Storage (если воспроизвести) — строка на месте, `errorToast`.
5. `npx tsc --noEmit`.

## Критерий готовности L10

- `storage.remove` + delete строки библиотеки только в `deleteAttachment`.
- Страница только вызывает хелпер после `requireProductId`.
- Диалог по-прежнему detach, не delete.

## Оценка

Перенос двух вызовов supabase в lib. Риск — начать удалять файл из попапа или убрать `.eq("product_id")`. Канон это фиксирует.

## Итог

Сделано: `deleteAttachment` в `src/lib/attachments.ts` (сначала Storage, затем строка с `.eq("product_id")`). Страница вызывает хелпер после `requireProductId`. Диалог сущности по-прежнему `detachFromEntity`.
