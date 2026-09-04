# План исправления M1: удалить неиспользуемый `useCrudMutations`

## Обзор

`src/hooks/useCrudMutations.ts` — черновик общего add/update/delete: toast, `requireProductId`, `.eq("product_id")` (H7). Вызовов нет. Живой CRUD страниц уже не тот, для которого хук писали: фичи — `createFeature` (H2), связь вложений — `syncAttachmentLinksForFeatureHypothesis` (H6), архив — `archived_at`, формула — upsert.

Два варианта из аудита: подключить к values/metrics на Strategy или удалить. Этот план **удаляет хук**. Подключение хуже: меняет UX, не покрывает формулу и тянет «общий CRUD» туда, где его уже обошли специализированные хелперы.

Миграции БД не нужны. Поведение Strategy не менять.

## Почему не подключать

| Что на Strategy | Что сделает хук | Почему плохо |
|-----------------|-----------------|--------------|
| Values: inline-правка, **без** success-toast | Всегда «Value added/updated/deleted successfully» | Шум на каждое нажатие Plus и каждый blur |
| Metrics: то же, плюс `refetchMetrics()` | `invalidateQueries({ queryKey })` + toast | Другой способ обновления кэша (это M7); toast лишний |
| Formula: `upsert` по `product_id` | Только insert / update-by-id / delete | Не ложится на API хука |
| Add value считает `position` | Можно передать в payload | Единственный кусок, который совпадает |

Чтобы хук подошёл, его пришлось бы калечить: флаги «без toast», `tableName: string` против типов Supabase, `queryKey: string[]` против `*Key` из `productQueries` (M7). На шесть мутаций values/metrics это дороже, чем оставить локальные `useMutation`.

Фичи, гипотезы, цели, вложения, архив в хук **не** переносить — это уже другие модули.

## Цель

1. Удалить `src/hooks/useCrudMutations.ts`.
2. Нигде не импортировать (сейчас и так нет вызовов).
3. Values/metrics/formula на Strategy оставить как есть (фильтр H7 уже на месте).

## Вне скоупа

- M6: error-toast на values/metrics (сейчас ошибки глотаются). Не добавлять toast «заодно» при удалении хука.
- M7: канон `invalidateQueries` / `metricsKey`.
- M8: снять `if (!user)` с оставшихся мутаций Strategy.
- Переписывать values/metrics на общий слой «на вырост».
- Менять `docs/general/strategy-page.md` — хук там не описан.

## Шаг 1. Удалить файл

Убрать `src/hooks/useCrudMutations.ts`.

Grep `useCrudMutations` по репозиторию: пусто в `src/`. В планах H1/H4/H7 упоминания как «вне скоупа / на потом» можно не чистить — это история; при желании одна строка в H7 «вне скоупа»: хук удалён в M1.

## Шаг 2. Проверка

1. Grep `useCrudMutations` / `use-crud-mutations` в `src/` пустой.
2. `npx tsc --noEmit`.
3. Strategy: Plus value/metric, inline-правка, delete — как сейчас, без новых тостов.

## Критерий готовности M1

- Файла хука нет.
- Values/metrics по-прежнему локальные мутации с `requireProductId` + `.eq("product_id")`.
- Нет нового общего CRUD-слоя.

## Оценка

Удаление одного файла, без SQL и без регрессии UI. Риск — нулевой, пока никто не импортировал хук. Если позже понадобится общий write-хелпер, это будет узкая функция «update/delete по id+product_id», а не хук с тостами и `Record<string, any>`.

## Сводка по итогам

Сделано. `src/hooks/useCrudMutations.ts` удалён. Values/metrics/formula на Strategy без изменений.
