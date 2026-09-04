# План исправления H5: один справочник колонок доски

## Обзор

Один и тот же набор `board_column` описан дважды: заголовки канбана на Board и Select колонки в «Create Feature from Hypothesis». Id совпадают, подписи уже нет: на Hypotheses укороченные «Design» / «Development» / «On Hold». Фича, созданная с гипотезы в «Design», на доске оказывается в колонке «Design & Analysis» — пользователь видит другое имя той же стадии.

Статусы гипотез сюда не входят: после H3 они в `src/lib/hypotheses.ts`.

Миграции БД не нужны: в таблице по-прежнему строка (`inbox`, `design`, …). `types.ts` не регенерировать.

## Проблема

| | Board (`BoardPage.columns`) | Hypotheses (Select в Create Feature) |
|--|-----------------------------|--------------------------------------|
| Id | одинаковые 8 значений | те же |
| design | Design & Analysis | Design |
| development | Development & Testing | Development |
| onHold | On Hold / Blocked | On Hold |
| остальные | Inbox, Discovery, Backlog, Done, Cancelled | те же |

Канон подписей — доска и `docs/general/board-page.md`. Короткие имена на Hypotheses — дрейф.

Локальный `type ColumnId` скопирован в обоих файлах. `features.ts` держит свой `TERMINAL_COLUMNS = done|cancelled` для `closed_at` при создании; Board дублирует те же две проверки в save и в drag.

## Цель

1. Один каталог: id, порядок, подпись.
2. Board-колонки и Select на Hypotheses читают его.
3. `ColumnId` больше не объявлять на страницах.
4. Терминальные колонки (`done` / `cancelled`) — из того же модуля; `createFeature` и проверки на Board импортируют хелпер, не копируют литералы.

Поведение канбана и значения в БД не менять.

## Канон

**Файл:** `src/lib/board.ts` (как `goals.ts` / `hypotheses.ts`, без React).

Подписи — как на Board сейчас:

```ts
export const BOARD_COLUMNS = [
  { id: "inbox", label: "Inbox" },
  { id: "discovery", label: "Discovery" },
  { id: "backlog", label: "Backlog" },
  { id: "design", label: "Design & Analysis" },
  { id: "development", label: "Development & Testing" },
  { id: "onHold", label: "On Hold / Blocked" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]["id"];
```

Хелперы:

- `isBoardColumnId(value: string): value is BoardColumnId`
- `boardColumnLabel(id: string): string` — подпись из каталога, иначе сырой id (мусор из БД не роняет UI)
- `isTerminalBoardColumn(id: string): boolean` — `done` и `cancelled`

Не сужать `FeatureRow.board_column` в сгенерированных типах (остаётся `string`). На границе UI: `as BoardColumnId` / `isBoardColumnId`, как `GoalQuarter` в H4.

## Вне скоупа

- H6: копирование вложений при выборе гипотезы у сохранённой фичи.
- M10 целиком: сброс `closed_at` при уходе из Done/Cancelled. H5 только **общий список** терминальных id; логика «ставить / не сбрасывать» как сейчас.
- Postgres enum для `board_column`.
- Смена id колонок или порядка.
- Статусы гипотез (H3).

## Шаг 1. `src/lib/board.ts`

Каталог + три хелпера. Без импорта страниц.

`features.ts`: удалить локальный `TERMINAL_COLUMNS`, вызывать `isTerminalBoardColumn`. `CreateFeatureInput.board_column` и `CreateFeatureDraft` сменить на `BoardColumnId` (черновик с Hypotheses и так выбирает из списка).

## Шаг 2. BoardPage

- Удалить локальные `type ColumnId` и массив `columns`.
- Канбан: `BOARD_COLUMNS.map`.
- `DroppableColumn` / `createFeature` / `getFeaturesForColumn` / Select: `BoardColumnId`.
- Select: `BOARD_COLUMNS`, `value={editingFeature.board_column as BoardColumnId | undefined}`.
- `closed_at` в save и drag: `isTerminalBoardColumn(...)` вместо `=== 'done' || === 'cancelled'`.
- Хардкод `"discovery"` в Discover this feature оставить как id (он в каталоге); при желании константа не обязательна.

Сравнение `feature.board_column === column.id` остаётся: Row даёт `string`, id из каталога — литерал.

## Шаг 3. HypothesesPage

- Удалить свой `ColumnId` и массив `columns`.
- Select в Create Feature: те же `BOARD_COLUMNS` и подписи, что на доске.
- Default по-прежнему `backlog`.
- `onValueChange: BoardColumnId`.

После шага пользователь, выбрав «Design & Analysis» с гипотезы, видит ту же подпись на канбане.

## Шаг 4. Документация (коротко)

`docs/general/hypotheses-page.md`: в Create Feature колонка — те же имена, что на Board (не «короткий Design»). Список восьми подписей дублировать не обязательно, достаточно отсылки к Board.

`docs/general/board-page.md` уже совпадает с каноном — не переписывать.

## Шаг 5. Проверка вручную

1. Board: восемь колонок, подписи как сейчас (включая Design & Analysis, Development & Testing, On Hold / Blocked).
2. Hypotheses → Create Feature: Select с теми же восемью подписями; default Backlog.
3. Создать фичу с гипотезы в Design & Analysis — карточка в этой колонке на Board.
4. Board: новая фича в колонке (Add), перенос в Done — `closed_at` как сейчас.
5. Неизвестное значение в БД (если есть) — Select/заголовок не падают; label = сырой id.

## Критерий готовности H5

- Grep `type ColumnId` в `src/` пустой.
- Массив колонок с `label:` только в `src/lib/board.ts`.
- Grep `Design"` / `"On Hold"` (короткие подписи) в `src/` пустой; длинные — из каталога.
- `TERMINAL_COLUMNS` / `=== 'done' || === 'cancelled'` для колонок доски только через `isTerminalBoardColumn` (кроме случайного текста в UI).

## Оценка

Небольшой рефакторинг, без SQL. Риск — забыть Select на Hypotheses и оставить старый массив. Шаг 1 независим; 2 и 3 после него. M10 потом меняет поведение `closed_at`, не каталог.

## Сводка по итогам

Сделано. `src/lib/board.ts` — `BOARD_COLUMNS`, `BoardColumnId`, `isTerminalBoardColumn`. Board и Select «Create Feature from Hypothesis» читают каталог (полные подписи). `createFeature` ставит `closed_at` через тот же хелпер. Локальный `ColumnId` снят.
