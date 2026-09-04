# План исправления M9: один цикл загрузки файлов

## Обзор

`ensureAttachmentFromFile` уже общий. Два `uploadMutation` всё равно копируют цикл: `used`, вызов ensure, `errorToast` на `!ok`, учёт квоты `used += file.size`. Расходится только ветка «файл уже есть» и то, прикреплять ли к сущности.

Подпись «of 200 MB used» захардкожена в трёх местах, хотя `MAX_PRODUCT_BYTES` уже в `src/lib/attachments.ts`. H6 на загрузку не влиял.

Миграции не нужны. Success-toast и кнопки Upload не сливать: тексты разные.

## Проблема

| | AttachmentsPage | EntityAttachmentsDialog |
|--|-----------------|-------------------------|
| Ensure | `ensureAttachmentFromFile(productId, file, used)` | то же |
| `!ok` | `errorToast(\`${file.name}: …\`)` + `continue` | то же |
| Уже в библиотеке | toast «This file already exists», **не** копировать, used не растёт | **прикрепить** `attachToEntity`, used не растёт |
| Новый файл | `used += size`, счётчик uploaded | `used += size`, createdCount, затем attach |
| Success | «File uploaded» / N files | uploaded and attached / existing attached |
| Квота в UI | `{formatBytes(usedBytes)} of 200 MB used` (пустое состояние и таблица) | та же строка |

Цикл и литерал «200 MB» — дубль. Поведение дубля по хешу **должно остаться разным** (так задумано в плане attachment-links: библиотека не плодит копию, попап прикрепляет существующий).

## Цель

1. Один `uploadFiles` рядом с `ensureAttachmentFromFile`. Цикл, квота `used`, toast на `!ok` — внутри хелпера.
2. Разница только колбэками: `onExisting` (страница), `onAttached` (диалог).
3. Подпись квоты — `formatBytes(usedBytes)` и `formatBytes(MAX_PRODUCT_BYTES)`, без литерала `200 MB` в JSX.
4. Мутации и success-toast остаются на местах. `attachToEntity` / `detachFromEntity` не трогать.

## Канон

**Файл:** `src/lib/attachments.ts`

```ts
export async function uploadFiles(
  productId: string,
  files: File[],
  usedBytes: number,
  options?: {
    onExisting?: (file: File, attachmentId: string) => void | Promise<void>;
    onAttached?: (
      file: File,
      attachmentId: string,
      created: boolean,
    ) => void | Promise<void>;
  },
): Promise<{ created: number; attached: number }> {
  let used = usedBytes;
  let created = 0;
  let attached = 0;

  for (const file of files) {
    const result = await ensureAttachmentFromFile(productId, file, used);
    if (!result.ok) {
      errorToast(`${file.name}: ${result.message}`);
      continue;
    }
    if (result.created) {
      used += file.size;
      created += 1;
    } else {
      await options?.onExisting?.(file, result.attachmentId);
    }
    if (options?.onAttached) {
      await options.onAttached(file, result.attachmentId, result.created);
      attached += 1;
    }
  }

  return { created, attached };
}
```

`errorToast` — тот же модуль, что M6; оба caller’а сейчас копируют эту строку.

Страница (как сейчас: дубль не прикрепляет):

```ts
const { created } = await uploadFiles(productId, files, usedBytes, {
  onExisting: (file) => {
    toast({ title: "This file already exists", description: file.name });
  },
});
return { uploaded: created };
```

Диалог (дубль прикрепляет, без toast «already exists»):

```ts
return uploadFiles(productId, files, usedBytes, {
  onAttached: async (_file, attachmentId) => {
    await attachToEntity(kind, entityId, attachmentId);
  },
});
```

`onSuccess` диалога: `created` ← `created`, `attachedCount` ← `attached`.

Квота в UI — маленькая функция в том же файле, чтобы не копировать шаблон трижды:

```ts
export function formatQuotaUsed(usedBytes: number): string {
  return `${formatBytes(usedBytes)} of ${formatBytes(MAX_PRODUCT_BYTES)} used`;
}
```

`formatBytes(MAX_PRODUCT_BYTES)` даст `"200.0 MB"` вместо литерала `"200 MB"`. Допустимо. Если режем глаз — в `formatBytes` не печатать `.0` у целых; не заводить вторую константу «200».

`requireProductId` остаётся в `mutationFn` страницы **до** вызова `uploadFiles`.

## Где менять

- `src/lib/attachments.ts` — `uploadFiles`, `formatQuotaUsed`; импорт `errorToast`.
- `AttachmentsPage.uploadMutation` — цикл заменить вызовом; три подписи квоты → `formatQuotaUsed(usedBytes)`.
- `EntityAttachmentsDialog.uploadMutation` — то же; одна подпись квоты.

Снять неиспользуемый импорт `ensureAttachmentFromFile` со страницы и из диалога.

Grep `ensureAttachmentFromFile` в `src/` — только `attachments.ts`. Литерал `of 200 MB used` — пустой.

## Вне скоупа

- M17: ветки `kind` в `attachmentLinks`.
- Общий React-хук upload/delete.
- Склеить success-toast страницы и диалога.
- Менять `ensureAttachmentFromFile` / хеш / Storage.
- Выравнивать `handleFileInputChange` (сброс `<input>`).
- Перенос библиотечного fetch в `productQueries` (ключ `["attachments", productId]` и так совпадает).

`attachments-page.md` / `data-model.md` уже говорят «200 MB» про лимит продукта — не переписывать под `.0` в UI.

## Шаг 1. Хелперы в `attachments.ts`

`uploadFiles` и `formatQuotaUsed` как выше. Цикл один в один с текущей семантикой: `continue` на ошибке файла, квота растёт только у `created`.

## Шаг 2. Два caller’а и подпись квоты

Мутации оставляют invalidate / onError / тексты success как сейчас.

## Шаг 3. Проверка вручную

1. Библиотека: новый файл — toast uploaded, строка в таблице, квота растёт.
2. Библиотека: тот же файл ещё раз — «This file already exists», второй строки нет.
3. Библиотека: слишком большой / exe — toast с именем файла, цикл идёт дальше (несколько файлов).
4. Попап фичи/гипотезы: новый файл — в Attached и в library, toast uploaded and attached.
5. Попап: файл, который уже в library — появляется в Attached без второй копии, toast existing attached.
6. Подпись квоты на странице (пусто / список) и в диалоге — одно и то же, без литерала 200.
7. `npx tsc --noEmit`.

## Критерий готовности M9

- Цикл `for (const file of files)` + `ensureAttachmentFromFile` только в `uploadFiles`.
- Страница и попап по-разному обрабатывают дубль (toast vs attach).
- Квота в UI из `MAX_PRODUCT_BYTES`.
- Success-тексты прежние.

## Оценка

Один хелпер и замена двух циклов. Риск — вызвать `onAttached` на странице или `onExisting` в диалоге и сломать семантику дубля; канон выше это разводит. Не тащить `attachToEntity` внутрь `attachments.ts`.

## Итог

Сделано: `uploadFiles` и `formatQuotaUsed` в `src/lib/attachments.ts`. Страница передаёт `onExisting`, попап — `onAttached`. Цикл `ensureAttachmentFromFile` только в хелпере. Подпись квоты без литерала 200 MB; у целых мегабайт `formatBytes` не печатает `.0`.
