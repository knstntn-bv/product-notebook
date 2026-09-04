# План исправления H2: одно создание фичи и один human_readable_id

## Обзор

Создание фичи скопировано в `BoardPage.saveFeatureMutation` (ветка без `id`) и `HypothesesPage.createFeatureMutation`. Общий блок: позиция в колонке, префикс из имени инициативы, `count(*)+1`, сборка `PREFIX-N`, insert. Расхождение уже внутри этой копии: Board ставит `closed_at` при Done/Cancelled, Hypotheses копирует вложения с гипотезы и возвращает `id`.

После H1 список фич и инициатив уже из общих хуков/контекста. Этот план только про **запись новой фичи**, не про чтение.

Миграции БД не нужны.

## Проблема

Одинаковый алгоритм в двух mutationFn (~40 строк). Правка ID или позиции попадёт только в одну страницу.

| Шаг | Board (insert) | Hypotheses (`createFeatureMutation`) |
|-----|----------------|--------------------------------------|
| `max(position)` в колонке | да, из кэша `features` | да, из того же кэша |
| префикс | 3 буквы имени инициативы или `NNN` | то же |
| номер | `count(*)` по продукту + 1 | то же |
| insert полей | те же + `closed_at` если done/cancelled | те же, **без** `closed_at` |
| после insert | ничего | `copyAttachmentLinks(hypothesis → feature)` |
| возврат | нет | `{ id }` через `.select().single()` |

Редактирование фичи на Board (ветка `feature.id`) и drag — **не** дубль H2. `closed_at` при update/drag остаётся M10.

## Цель

1. Один модуль: позиция, `human_readable_id`, insert.
2. Оба экрана вызывают его вместо локальной копии.
3. Поведение **создания** выровнять: `closed_at` на терминальных колонках и копирование вложений, если задан `hypothesis_id`. Это закрывает дрейф внутри дубля; полный H6 (выбор гипотезы у уже сохранённой фичи) и полный M10 (сброс `closed_at` при уходе из Done) — не здесь.
4. Поток «Create Feature from Hypothesis»: связь с гипотезой ставится автоматически и **не редактируется**. В диалоге поле видно, но заблокировано. Сейчас `hypothesis_id` пишется в стейт в `handleCreateFeature`, но в UI его нет — пользователь не видит, к чему привяжется фича.

## Вне скоупа

- H3 форма гипотезы, H4 типы на страницах, H5 колонки/статусы, M4 combobox.
- H6 целиком: копирование при **update** фичи / Discover this feature.
- M10: `closed_at` в drag и в update; очистка при выходе из Done/Cancelled.
- Гонка `count(*)+1` при двух одновременных созданиях (как сейчас). Уникальный constraint не добавляем.
- Смена правила префикса (кириллица, пробелы) — оставить `substring(0, 3).toUpperCase()` или `NNN`.
- На Board при создании фичи из колонки combobox гипотезы остаётся редактируемым (это не поток «из гипотезы»). Менять его в H2 не нужно.

## Поток «из гипотезы»: фиксированная связь

Источник: кнопка Create Feature в редакторе гипотезы → `handleCreateFeature(hypothesis)`.

Правила:

1. `hypothesis_id` задаётся один раз из `hypothesis.id` при открытии диалога. Save обязан отправить этот id, даже если UI его не трогал.
2. Пользователь не может выбрать другую гипотезу, снять связь («None») или очистить поле.
3. В правой колонке диалога — пункт **Linked Hypothesis** (как на Board), но не combobox: disabled-кнопка или текст + `aria-disabled`. Подпись: insight гипотезы, fallback «Untitled hypothesis».
4. Goal, initiative и column по-прежнему редактируются.
5. `createFeature` в lib не проверяет «поток»: он просто пишет переданный `hypothesis_id`. Гарантия неизменности — в UI и в том, что mutation берёт id из исходной гипотезы, а не из редактируемого combobox.

Визуально лучше повторить outline-кнопку Board (`w-full justify-between`), с `disabled` и без Popover. Отдельный общий combobox (M4) сюда не подключать.

## Канон создания

Вход:

- `productId`
- поля: `title`, `description`, `goal_id`, `initiative_id`, `hypothesis_id`, `board_column`
- уже загруженные `features` (для позиции в колонке) и `initiatives` (для префикса)

Алгоритм:

1. `position = max(position в этой колонке) + 1`, если колонка пуста — `0`.
2. `prefix` = первые 3 символа `initiative.name` в верхнем регистре, иначе `NNN`.
3. `n = count(features where product_id) + 1` (запрос в БД, не длина кэша: кэш может быть неполным).
4. `human_readable_id = `${prefix}-${n}``.
5. Insert: перечисленные поля + `product_id`, `position`, `human_readable_id`.
6. Если `board_column` это `done` или `cancelled` — `closed_at = now()` (как Board).
7. Если есть `hypothesis_id` — `copyAttachmentLinks("hypothesis", hypothesis_id, "feature", created.id)` (как Hypotheses).
8. Вернуть созданную строку (минимум `id`).

Update на Board не вызывает этот алгоритм.

## Шаг 1. Модуль `src/lib/features.ts`

Чистые функции (удобно тестировать правилом ID без UI):

- `nextPositionInColumn(features, boardColumn): number`
- `featureIdPrefix(initiativeName: string | null | undefined): string` — `NNN` или 3 символа uppercase
- `buildHumanReadableId(prefix, featureNumber): string`

Async:

- `nextFeatureNumber(productId): Promise<number>` — текущий `count` + 1
- `createFeature(input): Promise<FeatureRow>` — шаги канона, `.insert(...).select("*").single()`

Типы: `FeatureRow` из `productQueries` / `Tables<"features">`. Страницы могут передать локальный `Partial<Feature>`.

Не импортировать React и страницы. `copyAttachmentLinks` — из уже существующего `attachmentLinks.ts`.

`closed_at` на insert — локальная однострочная проверка колонки, **не** общий `applyClosedAt` для drag (это M10).

## Шаг 2. Board: insert через `createFeature`

**Файл:** `src/pages/BoardPage.tsx` — `saveFeatureMutation`

- Ветка `if (feature.id)` без изменений (кроме того, что не дублирует ID-логику).
- Ветка else: `await createFeature({ productId, title, description, goal_id, initiative_id, hypothesis_id, board_column, features, initiatives })`.
- Удалить локальные maxPosition / prefix / count / insert / `closed_at` на insert.
- `onSuccess` как сейчас: invalidate `["features"]`, закрыть диалог, toast. Если `createFeature` скопировал вложения — добавить invalidate `feature_attachments` и `attachment_link_flags`, иначе флаги на странице вложений устареют. Это следствие канона, не отдельная фича.

`if (!user)` в insert больше не нужен для payload; можно оставить общую проверку мутации или опереться на `currentProductId` (как в H1/M8 — не раздувать).

## Шаг 3. Hypotheses: то же `createFeature` и заблокированная связь

**Файл:** `src/pages/HypothesesPage.tsx`

- Заменить тело `createFeatureMutation` на вызов `createFeature` с полями из диалога **и** `hypothesis_id` исходной гипотезы.
- Удалить свой maxPosition / prefix / count / insert / `copyAttachmentLinks`.
- `onSuccess` оставить: закрыть диалог, toast, invalidate features + attachment keys.
- В `rightContent` диалога «Create Feature from Hypothesis» добавить Linked Hypothesis **выше** Goal: disabled-контроль, текст = insight. Не открывать Command/Popover.
- Не добавлять `onChange` / «None». `handleSaveFeature` не должен давать сохранить без `hypothesis_id` в этом диалоге (если стейт сбросился — не слать mutate).

## Шаг 4. Проверка вручную

1. Board: новая фича в Backlog — `NNN-<n>` или префикс инициативы, карточка в конце колонки.
2. Board: создать в колонке, где уже есть карточки — `position` больше максимума, визуально внизу.
3. Board: новая фича сразу в Done — в БД `closed_at` не null (как раньше только на Board).
4. Hypotheses: Create Feature из гипотезы — ID по тому же правилу, фича на доске в выбранной колонке, вложения гипотезы на фиче, в карточке/редакторе фичи гипотеза та же, из которой создавали.
5. Тот же диалог: поле Linked Hypothesis видно, не кликается, другую гипотезу выбрать нельзя. Goal/initiative/column меняются.
6. Board: новая фича из колонки — combobox гипотезы как сейчас (можно None / другую). Не путать с п.4–5.
7. Редактирование существующей фичи на Board (title/column) не меняет `human_readable_id`.
8. Две фичи подряд на одном продукте — номера `n` и `n+1`, без коллизии в обычном UI (не параллельный двойной клик).

## Критерий готовности H2

- Grep по `human_readable_id` / `substring(0, 3)` в `src/pages` не находит генерацию ID — только отображение/экспорт на Board.
- `count(*)` фич для номера — только в `src/lib/features.ts`.
- Оба экрана создают фичу через `createFeature`.
- Диалог «из гипотезы» показывает Linked Hypothesis disabled; в БД у новой фичи `hypothesis_id` = id исходной гипотезы.

## Оценка

Небольшой рефакторинг плюс один locked-блок в диалоге Hypotheses. Основной риск — забыть invalidate вложений на Board после того, как create начнёт копировать ссылки. Шаги 2 и 3 независимы после шага 1.

## Сводка по итогам

Сделано. `src/lib/features.ts` — `createFeature` (позиция в колонке, `PREFIX-N`, `closed_at` на Done/Cancelled, `copyAttachmentLinks` если есть `hypothesis_id`). Board и Hypotheses вызывают его вместо локальных insert. Диалог «из гипотезы»: Linked Hypothesis виден и disabled; длинный insight обрезается (`min-w-0` / truncate в `EntityDialog`). H6 (копирование при выборе гипотезы у уже сохранённой фичи) не входил.
