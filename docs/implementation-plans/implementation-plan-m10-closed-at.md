# План исправления M10: `closed_at` ставится и сбрасывается в одном месте

## Обзор

H2/H5 закрыли создание: `createFeature` ставит `closed_at` через `isTerminalBoardColumn`. На Board та же формула скопирована в save, drag-мутацию и две optimistic-ветки: «если терминальная колонка — `new Date().toISOString()`». Обратного хода нет: Inbox / Discovery после Done оставляют старую дату.

Это расходится с живым UX (карточка снова открыта) и совпадает со старым планом PRO-68 / `data-model.md` («при уходе не сбрасывать»). M10 **меняет** это правило: открытая колонка → `closed_at = null`. Документ модели обновить вместе с кодом.

Миграции не нужны: колонка уже nullable. HypothesesPage не трогать — insert идёт через `createFeature`.

## Проблема

Одинаковый `if (board_column && isTerminalBoardColumn(…)) { … closed_at = now }`:

| Место | Пишет `now` | Пишет `null` |
|-------|-------------|--------------|
| `createFeature` | Done/Cancelled при insert | нет (поле просто не в insert) |
| `saveFeatureMutation` update | если колонка терминальная | нет — Save из Done в Inbox дату не чистит |
| `dragFeatureMutation` | если в update есть терминальный `board_column` | нет |
| optimistic: дроп на карточку другой колонки | то же | нет |
| optimistic: дроп на пустую колонку | то же | нет |
| Discover (`board_column: "discovery"`) | не ставит | не чистит — Done → Discovery с старым `closed_at` |

Reorder в той же колонке `board_column` в payload нет — `closed_at` не трогать (не рештампить Done при сортировке).

Save фичи, которая **уже** в Done: сейчас каждый Save перезаписывает `closed_at`. Это не дыра M10; `applyClosedAt` смотрит только на следующую колонку, поведение Save в Done оставляем.

## Цель

1. Одна функция: следующая колонка → ISO или `null`.
2. Вызывать её везде, где Board или `createFeature` пишут колонку (включая Discover и optimistic).
3. Нетерминальная колонка в том же write → явно `closed_at: null`.
4. `data-model.md`: уход из Done/Cancelled сбрасывает поле.

UI канбана не менять. Значения id колонок не менять.

## Канон

**Файл:** `src/lib/board.ts` (рядом с `isTerminalBoardColumn`, не в `features.ts`).

```ts
export function applyClosedAt(column: string | null | undefined): string | null {
  if (column && isTerminalBoardColumn(column)) return new Date().toISOString();
  return null;
}
```

Писать поле только если в этом update есть колонка:

```ts
if (update.board_column) {
  updateData.closed_at = applyClosedAt(update.board_column);
}
```

Save / Discover / insert — колонка всегда известна:

```ts
updateData.closed_at = applyClosedAt(feature.board_column);
insertData.closed_at = applyClosedAt(input.board_column);
```

`null` должен уйти в PostgREST (ключ в объекте update), иначе поле не очистится.

Не передавать предыдущую колонку. Не сравнивать «колонка изменилась». Не инжектить `now` для тестов.

## Где менять

- `board.ts` — `applyClosedAt`.
- `features.ts` — вместо `if (isTerminalBoardColumn) insertData.closed_at = …` всегда `insertData.closed_at = applyClosedAt(input.board_column)`. Импорт `isTerminalBoardColumn` снять, если больше не нужен.
- `BoardPage`:
  - save update;
  - `dragFeatureMutation`;
  - оба optimistic-блока в `handleDragEnd`;
  - Discover: в тот же `.update({ hypothesis_id, board_column: "discovery" })` добавить `closed_at: applyClosedAt("discovery")` (это `null`).
- `docs/general/data-model.md` — секция Closed At: при уходе из Done/Cancelled поле `null`; при входе/повторном входе — текущий timestamp.

Снять комментарии «Set closed_at when moving to done or cancelled» вместе с копипастой.

Grep `closed_at = new Date` / `isTerminalBoardColumn` для записи даты — только `applyClosedAt`.

## Вне скоупа

- HypothesesPage (нет своего write `closed_at`).
- M16: общий optimistic DnD.
- Не рештампить `closed_at` только при смене колонки на Save (можно позже).
- SQL COMMENT / старый `implementation-plan-feature-closed-at.md`.
- Показ `closed_at` на карточке.
- Типизация `updateData: any` в drag (L5).

## Шаг 1. `applyClosedAt`

В `board.ts`. Без React.

## Шаг 2. Все write-пути колонки

`createFeature` + Board save/drag/optimistic/Discover.

## Шаг 3. Документ модели

Три буллета Closed At привести к новому правилу. Строка в Key Fields: nullable, ISO на терминальной колонке, `null` на остальных.

## Шаг 4. Проверка вручную

1. Новая фича в Inbox — `closed_at` null; сразу в Done — не null.
2. Drag Inbox → Done — дата есть (optimistic и после refetch).
3. Drag Done → Inbox — `closed_at` null на карточке после refetch (главная дыра).
4. Drag Done → Cancelled — новая дата, не старая.
5. Reorder внутри Done — дата не меняется.
6. Save: колонка Done → Inbox в диалоге — null в БД.
7. Discover с фичи в Done — колонка Discovery, `closed_at` null.
8. `npx tsc --noEmit`.

## Критерий готовности M10

- Дата закрытия задаётся только `applyClosedAt`.
- Уход с Done/Cancelled (drag, save, Discover) пишет `null`.
- Вход на Done/Cancelled пишет now.
- Reorder без смены колонки поле не трогает.
- `data-model.md` совпадает с кодом.

## Оценка

Четыре одинаковых `if` плюс Discover и одна правка доки. Риск — забыть `null` в объекте update (PostgREST не сотрёт поле) или применить хелпер к reorder без `board_column` и занулить Done при сортировке. Канон «только если колонка в этом update» это закрывает.

## Итог

Сделано: `applyClosedAt` в `src/lib/board.ts`. `createFeature`, save/drag/optimistic на Board и Discover пишут ISO или `null`. Reorder без `board_column` поле не трогает. `docs/general/data-model.md` описывает сброс при уходе из Done/Cancelled.
