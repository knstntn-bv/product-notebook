# План исправления M17: карта kind → таблица связей вложений

## Обзор

`listLinkedAttachmentIds` / `attachToEntity` / `detachFromEntity` / `copyAttachmentLinks` отличаются только таблицей junction и именем колонки сущности. Четыре раза `if (kind === "hypothesis") … else feature`.

H6 добавил `syncAttachmentLinksForFeatureHypothesis` поверх `copy` — это оркестрация двух копий, не пятая ветка kind. Карту kind → table это не заменяет.

Миграции не нужны. Публичные сигнатуры и поведение (в том числе `23505` на attach, `upsert` + `ignoreDuplicates` на copy) не менять.

## Проблема

| Операция | hypothesis | feature |
|----------|------------|---------|
| list | `hypothesis_attachments` / `hypothesis_id` | `feature_attachments` / `feature_id` |
| attach insert | те же | те же |
| detach delete | те же | те же |
| copy upsert | те же на **toKind** (from идёт через list) | те же |

`attachmentLinkFlags` kind не принимает: всегда оба запроса. Строки имён таблиц там всё равно захардкожены.

`archiveRow` в `archive.ts` — другой дубль (`goals` vs `initiatives` + ternary `from`). Не тащить его сюда и не обобщать.

## Цель

1. Одна карта `AttachmentLinkKind` → `{ table, entityColumn }`.
2. list / attach / detach / copy читают карту, без `if (kind === "hypothesis")`.
3. `syncAttachmentLinksForFeatureHypothesis` без изменений по смыслу: два `copyAttachmentLinks`.
4. Имена junction-таблиц в файле живут в карте; flags берёт `table` оттуда.

Страницы и диалог не трогать: те же экспорты.

## Канон

**Файл:** `src/lib/attachmentLinks.ts` (не новый модуль).

```ts
const ATTACHMENT_LINK_TARGETS = {
  hypothesis: {
    table: "hypothesis_attachments",
    entityColumn: "hypothesis_id",
  },
  feature: {
    table: "feature_attachments",
    entityColumn: "feature_id",
  },
} as const;

function attachmentLinkTarget(kind: AttachmentLinkKind) {
  return ATTACHMENT_LINK_TARGETS[kind];
}

function linkRow(
  kind: AttachmentLinkKind,
  entityId: string,
  attachmentId: string,
) {
  const { entityColumn } = attachmentLinkTarget(kind);
  return { [entityColumn]: entityId, attachment_id: attachmentId };
}
```

list / detach:

```ts
const { table, entityColumn } = attachmentLinkTarget(kind);
const { data, error } = await supabase
  .from(table)
  .select("attachment_id")
  .eq(entityColumn, entityId);
```

attach: `insert(linkRow(kind, entityId, attachmentId))`, по-прежнему игнор `error.code === "23505"`.

copy: `listLinkedAttachmentIds(fromKind, fromId)`; upsert `attachmentIds.map((id) => linkRow(toKind, toId, id))`, `{ ignoreDuplicates: true }`. Не цикл `attachToEntity`.

Типы клиента: `from(table)` при union двух таблиц часто не принимает computed insert. Если `tsc` ругается — **один** assertion рядом с `linkRow` / `.from(table)`, не четыре `if`. Не делать `archiveRow`-style ternary `from("hypothesis_attachments") : from("feature_attachments")` в каждой функции: это текущий дубль.

`syncAttachmentLinksForFeatureHypothesis` — как сейчас, два copy.

`attachmentLinkFlags`: `.from(ATTACHMENT_LINK_TARGETS.hypothesis.table)` и `.feature.table`. Сигнатура `{ hypothesisIds, featureIds }` без generic по kind.

## Где менять

- Только `src/lib/attachmentLinks.ts`.
- Доки поведения не обязаны: UX тот же. При желании одна строка в `docs/general/data-model.md` у junction: операции через карту в `attachmentLinks.ts` — не обязательно, если негде уже описан модуль.

Grep в `attachmentLinks.ts`: `kind === "hypothesis"` — пусто. Литералы `"hypothesis_attachments"` / `"feature_attachments"` — только в `ATTACHMENT_LINK_TARGETS`.

Вызовы `listLinkedAttachmentIds` / `attachToEntity` / `detachFromEntity` / `copyAttachmentLinks` / `sync…` снаружи не менять.

## Вне скоупа

- Третий kind (цель, инициатива).
- Менять H6: когда sync, None, клон гипотезы.
- Склеивать flags в один generic «по kind».
- UI диалога, ключи RQ (`${kind}_attachments`).
- `archiveRow`.
- SQL / RLS.

## Шаг 1. Карта и хелперы

`ATTACHMENT_LINK_TARGETS`, `attachmentLinkTarget`, `linkRow`. Прогнать `tsc`: при необходимости assertion только здесь.

## Шаг 2. Четыре операции + flags

Переписать list/attach/detach/copy. Flags — имена таблиц из карты. sync не трогать.

## Шаг 3. Проверка вручную

1. Диалог вложений гипотезы: attach, detach, список.
2. То же у фичи на Board.
3. Повторный attach того же файла — без ошибки (23505).
4. Clone гипотезы — ссылки копируются (`copyAttachmentLinks`).
5. Create Feature / Discover / смена Linked Hypothesis — sync как после H6.
6. Attachments page: badges hypothesis/feature.
7. `npx tsc --noEmit`.

## Критерий готовности M17

- Ветки kind только как ключ карты, не копипаста table/column.
- sync тонкий, на copy.
- Поведение attach/copy/sync то же.
- Страницы без диффа (кроме случайного импорта — его не должно быть).

## Оценка

Локальный рефактор одного файла. Риск — сломать типы Supabase union `from` и «починить» четырьмя `as any` или вернуть if. Второй — заменить copy на N `attachToEntity` (лишние roundtrip, другой конфликт 23505 vs upsert). Держать upsert.

## Итог

Сделано: `ATTACHMENT_LINK_TARGETS` в `attachmentLinks.ts`. list/attach/detach/copy без `if (kind === "hypothesis")`. `syncAttachmentLinksForFeatureHypothesis` — два `copy`. `attachmentLinkFlags` берёт имена таблиц из карты. Assertion только в `linkRow` (union `from`).
