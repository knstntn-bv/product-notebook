# План исправления H1: один queryKey — один queryFn

## Обзор

React Query кэширует по `queryKey`. Сейчас у одних и тех же ключей на разных страницах разные `queryFn` (другой `ORDER BY` или трансформация строк). В кэше оказывается результат того запроса, который отработал первым — порядок и форма данных на соседней странице зависят от маршрута.

Код не меняем в этом документе; это только план. Миграции БД не нужны.

## Проблема

| Ключ | Кто запрашивает | Чем отличаются `queryFn` | Что ломается |
|------|-----------------|--------------------------|--------------|
| `["initiatives", productId]` | `ProductContext` | `.order("priority")` | Если раньше открыли Board/Hypotheses, Strategy/Roadmap могут получить список не по приоритету |
| тот же | `BoardPage`, `HypothesesPage` | `.order("created_at")` | Combobox’ы всё равно сортируют по имени на клиенте — серверный порядок им не нужен |
| `["features", productId]` | `BoardPage` | `.order("position")` | Канон для колонок доски |
| тот же | `HypothesesPage` | без `order` | Нужен только `max(position)` при создании фичи; при чужом кэше позиция всё равно считается на клиенте, но список «грязный» |
| `["hypotheses", productId]` | `BoardPage` | сырые строки, `.order("created_at")` | Combobox берёт `id` и `insight` |
| тот же | `HypothesesPage` | тот же order, но **маппинг в урезанный объект** | Если Hypotheses открыли первыми, Board получает урезанные объекты; если Board первыми — таблица гипотез живёт на сырых строках без гарантии `priority ?? 3` в `queryFn` |
| `["goals", productId]` | Roadmap, Board, Hypotheses | одинаково: `.order("created_at")` | Коллизии нет, но три копии одного запроса — риск повторить H1 при следующем патче |

`metrics`, `values`, `product_formula`, `attachments` в H1 не входят: ключ не разделяется между разными `queryFn`.

## Цель

1. На каждый ключ сущности — **один** `queryFn` и **один** серверный порядок.
2. Сортировка для UI (алфавит в combobox, приоритет на Strategy) — **только на клиенте**, после получения массива.
3. Не маппить и не урезать строки внутри `queryFn`. Нормализация `null` — в месте использования или отдельной чистой функции **после** чтения из кэша, одинаковой для всех потребителей.

## Вне скоупа (не делать в H1)

- Общие TypeScript-типы `Tables<>` (это H4).
- Унификация всех `invalidateQueries` до канонических ключей (M7) — кроме мест, которые трогаем сами.
- Перенос CRUD в `useCrudMutations` (M1).
- Combobox Goal/Initiative (M4), `closed_at` (M10), каскад `initiative_id` (M19).
- Вычистка shadcn.

Минимально допустимо: страницы продолжают объявлять локальные `interface Feature` и т.п. Хуки могут возвращать `data as` текущий локальный тип, чтобы не раздувать diff.

## Канон запросов

| Сущность | Ключ | Серверный `order` | Почему |
|----------|------|-------------------|--------|
| initiatives | `["initiatives", productId]` | `priority` ASC | Это порядок продукта (Strategy/Roadmap). Board/Hypotheses уже делают `localeCompare` по имени |
| features | `["features", productId]` | `position` ASC | Доска и `max(position)` при создании фичи |
| hypotheses | `["hypotheses", productId]` | `created_at` ASC | Оба экрана так и хотели; **без** `.map` в `queryFn` |
| goals | `["goals", productId]` | `created_at` ASC | Как сейчас везде |

`select("*")`, `.eq("product_id", productId)`, `enabled: !!productId`, пустой массив если нет продукта.

## Шаг 1. Общий модуль ключей и fetch

**Новый файл:** `src/lib/productQueries.ts` (имя можно `src/lib/queries.ts` — один файл, без россыпи хуков).

Содержимое:

- Фабрики ключей: `initiativesKey(productId)`, `featuresKey`, `hypothesesKey`, `goalsKey` — возвращают тот же кортеж, что сейчас.
- `fetchInitiatives(productId)`, `fetchFeatures`, `fetchHypotheses`, `fetchGoals` — единственные `queryFn`.
- Тонкие хуки `useInitiativesQuery`, `useFeaturesQuery`, `useHypothesesQuery`, `useGoalsQuery`: внутри `useProduct()` / переданный `productId`, `useQuery({ queryKey, queryFn, enabled })`.

Хуки не делают CRUD и не сортируют под UI.

**Проверка:** модуль не импортирует страницы; страницы/контекст импортируют модуль.

## Шаг 2. Инициативы — убрать второй fetch

**Файлы:** `src/contexts/ProductContext.tsx`, `src/pages/BoardPage.tsx`, `src/pages/HypothesesPage.tsx`

1. В `ProductContext` заменить локальный `useQuery` инициатив на `useInitiativesQuery` (тот же ключ и `order("priority")`).
2. На Board и Hypotheses **удалить** свой `useQuery` по `["initiatives", …]`.
3. Брать `initiatives` из `useProduct()` — как уже делают Strategy и Roadmap.
4. Оставить клиентский `sortedInitiatives` (фильтр archived + имя). Не полагаться на порядок из кэша в combobox.

После шага коллизия инициатив невозможна: один `queryFn` живёт в контексте, страницы читают кэш через тот же ключ.

## Шаг 3. Фичи — один order(position)

**Файлы:** `src/pages/BoardPage.tsx`, `src/pages/HypothesesPage.tsx`

1. Оба экрана перевести на `useFeaturesQuery`.
2. Hypotheses больше не запрашивает фичи без `order`. Для `maxPosition` по колонке сортировка `position` достаточна и стабильнее.
3. Optimistic DnD на Board (`setQueryData(["features", currentProductId])`) должен использовать **ту же фабрику ключа**, иначе rollback попадёт мимо кэша.

Инвалидация: где уже есть `["features"]` без `productId`, можно не трогать (префикс всё равно сматчится). По желанию в затронутых мутациях сразу писать `featuresKey(currentProductId)` — это маленький кусок M7, не обязателен для закрытия H1.

## Шаг 4. Гипотезы — сырые строки, один queryFn

**Файлы:** `src/pages/HypothesesPage.tsx`, `src/pages/BoardPage.tsx`

1. Оба экрана — `useHypothesesQuery` (строки как пришли из Supabase).
2. Удалить `.map` из `queryFn` на Hypotheses. Дефолты (`priority ?? 3`, пустые строки, `impact_metrics` как массив) оставить в UI/мутациях, где они уже частично есть.
3. Combobox на Board (`hypothesis.insight`) не зависит от маппинга.

## Шаг 5. Цели — зафиксировать, пока не разъехались

**Файлы:** `src/pages/RoadmapPage.tsx`, `src/pages/BoardPage.tsx`, `src/pages/HypothesesPage.tsx`

Три одинаковых запроса заменить на `useGoalsQuery`. Поведения не менять. Optimistic move на Roadmap: `setQueryData` / `cancelQueries` через `goalsKey(currentProductId)`.

## Шаг 6. Проверка вручную

Порядок важен: кэш должен быть общим и предсказуемым.

1. Жёсткое обновление → Strategy: инициативы по возрастанию `priority`, архивные как сейчас (фильтр `showArchived`).
2. Board → назад на Strategy: порядок инициатив **тот же**, не «по дате создания».
3. Hypotheses → Strategy: то же.
4. Board: карточки в колонке по `position`; drag-and-drop после отпускания не скачет из‑за чужого порядка.
5. Hypotheses → Create Feature: новая фича встаёт в конец выбранной колонки (`max(position)+1`).
6. Board: список гипотез в combobox показывает insight; Hypotheses: таблица открывается с Board в истории и наоборот без пропавших полей / падений.
7. Roadmap: цели по инициативам/кварталам, drag между ячейками.

## Критерий готовности H1

- В `src/pages` и `ProductContext` нет второго `useQuery` с ключом `initiatives` / `features` / `hypotheses` / `goals` и своим `queryFn`.
- Grep по `queryKey: ["initiatives"` (и аналогам) находит только `productQueries.ts` плюс инвалидации/optimistic с фабрикой ключа.
- Серверный `order` для каждой сущности задан в одном месте.

## Оценка объёма

Небольшой рефакторинг, без UI-редизайна и без SQL. Основной риск — optimistic updates на Board/Roadmap, если ключ в `setQueryData` разъедется с хуком. Шаги 2–5 можно делать по сущности и проверять отдельно.
