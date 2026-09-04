# План исправления M3: один фильтр и сорт archived

## Обзор

Правило «показать архив / спрятать / архивные в конец» скопировано:

| Место | Фильтр | Сорт |
|-------|--------|------|
| Strategy, таблица инициатив | `showArchived \|\| !archived` | priority ASC, затем archived в конец |
| Roadmap, строки инициатив | то же | то же |
| Roadmap, цели в ячейке | `!showArchived` → убрать archived | только archived в конец |
| Board / Hypotheses, combobox Goal и Initiative | всегда `!archived` | алфавит (разный `localeCompare`) |

После H1 оба списка инициатив из одного кэша — дубль только в UI. M2 вынес **запись** архива в `archive.ts`; списки туда не входили.

Миграции не нужны. Поведение Strategy/Roadmap не менять. Combobox **не** подключать к `showArchived`.

## Решение по combobox

Настройка «Show Archived Items» в `docs/general/settings.md` явно про Strategy и Roadmap: какие **строки и карточки** видны.

Пикеры на Board и Hypotheses — выбор цели/инициативы **для новой или текущей фичи**. Архивная сущность в селекте:

- при выключенном токгле — и так скрыта;
- при включённом — пользователь мог бы привязать фичу к архивной инициативе, не замечая бейджа.

Оставить как сейчас: в combobox только неархивные, **независимо** от токгла. Это не баг и не вторая «видимость», а другой сценарий.

Алфавитный `localeCompare` (Board с `sensitivity: "base"`, Hypotheses без) **не** унифицировать — это разметка пикера, M4.

## Цель

1. Фильтр и сравнение archived — в `src/lib/archive.ts` рядом с `archiveRow`.
2. Strategy и Roadmap (инициативы + цели в ячейке) вызывают хелперы, не копируют компаратор.
3. Combobox: тот же фильтр с `showArchived = false`, сорт имени как сейчас на каждой странице.
4. Документ Settings: токгл не распространяется на пикеры Board/Hypotheses.

Не мутировать массив из React Query: хелпер фильтра всегда возвращает **новый** массив (сейчас Strategy копирует `[...]`, Roadmap полагается на `.filter()`).

## Канон

Дописать `src/lib/archive.ts`:

```ts
type WithArchive = { archived?: boolean | null };

export function visibleByArchive<T extends WithArchive>(
  items: readonly T[],
  showArchived: boolean,
): T[] {
  if (showArchived) return [...items];
  return items.filter((item) => !item.archived);
}

export function compareArchivedLast<T extends WithArchive>(a: T, b: T): number {
  if (a.archived && !b.archived) return 1;
  if (!a.archived && b.archived) return -1;
  return 0;
}

export function compareByPriorityThenArchive<
  T extends WithArchive & { priority: number },
>(a: T, b: T): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return compareArchivedLast(a, b);
}
```

`visibleByArchive(items, true)` — копия, чтобы `.sort()` не трогал кэш.

`archived: false` и `null`/`undefined` для фильтра считаются неархивными (`!item.archived`).

## Где вызывать

### Strategy — таблица инициатив

```ts
visibleByArchive(initiatives, showArchived).sort(compareByPriorityThenArchive)
```

Убрать локальный `[...initiatives].filter(...).sort(...)`.

### Roadmap — строки инициатив

То же. Убрать свой `.filter` / `.sort` с теми же комментариями.

### Roadmap — `getGoalsForCell`

Сначала ячейка (`initiative_id` + `quarter`), затем:

```ts
visibleByArchive(cellGoals, showArchived).sort(compareArchivedLast)
```

Не применять `compareByPriorityThenArchive` к целям — у цели нет того же смысла priority в ячейке.

### Board и Hypotheses — combobox

```ts
visibleByArchive(goals, false).sort(/* текущий localeCompare страницы */)
visibleByArchive(initiatives, false).sort(/* текущий localeCompare страницы */)
```

Не брать `showArchived` из контекста для этих списков.

Гипотезы в combobox на Board не архивируются — не трогать.

## Вне скоупа

- M2: `archiveRow` / payload записи.
- M4: общий EntityCombobox, выравнивание `localeCompare`.
- M19: каскад `initiative_id`.
- Визуал archived (opacity, badge) — остаётся в JSX.
- `show_archived` в БД / SettingsDialog / SidebarToggle.
- Сорт combobox по имени выносить в lib.

## Шаг 1. Хелперы в `archive.ts`

Три функции выше. Без импорта страниц.

## Шаг 2. Четыре потребителя

Strategy, Roadmap (две точки), Board `sortedGoals` / `sortedInitiatives`, Hypotheses то же.

Grep `showArchived || !` и `if (a.archived && !b.archived)` в `src/pages/` — пустой (кроме случайного JSX `isArchived &&`).

## Шаг 3. Документация

`docs/general/settings.md`, секция токгла: после Strategy/Roadmap — одно предложение: списки Goal/Initiative на Board и в Create Feature from Hypothesis показывают только неархивные записи, токгл на них не влияет.

`strategy-page.md` / `roadmap-page.md` уже описывают priority + archived last — не переписывать.

## Шаг 4. Проверка вручную

1. Токгл выкл: Strategy и Roadmap без архивных строк/карточек; combobox на Board/Hypotheses без архивных.
2. Токгл вкл: архивные инициативы внизу приоритета на Strategy и Roadmap; архивные цели в ячейке после активных, с opacity как сейчас; combobox **по-прежнему** без архивных.
3. Несколько инициатив с одним priority — неархивные выше архивных.
4. `npx tsc --noEmit`.

## Критерий готовности M3

- Компаратор archived last и priority+archive только в `archive.ts`.
- Combobox не читает `showArchived`.
- Settings описывает это явно.
- Поведение списков Strategy/Roadmap как до рефакторинга.

## Оценка

Перенос в уже существующий `archive.ts`, без SQL. Риск — подставить `showArchived` в combobox «для единообразия» и сломать пикеры; в шаге 2 этого не делать. M4 потом заменит два combobox, хелпер фильтра останется.

## Сводка по итогам

Сделано. `visibleByArchive`, `compareArchivedLast`, `compareByPriorityThenArchive` в `src/lib/archive.ts`. Strategy и Roadmap сортируют ими; combobox Board/Hypotheses — `visibleByArchive(..., false)`. `settings.md` фиксирует, что токгл на пикеры не влияет.

