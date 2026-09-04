# План исправления H3: один редактор гипотезы

## Обзор

Форма гипотезы скопирована в `HypothesesPage` (создание/правка) и `BoardPage` (Discover this feature). Левая колонка почти одинаковая; правая уже разъехалась: на Board нет `done`, другая подпись inProgress, нет priority, insert не пишет `priority` (в БД сработает default 3, в UI поле отсутствует).

После H2 создание фичи из гипотезы общее. Этот план — про **форму и статусы гипотезы**. Мутации «создать гипотезу и привязать фичу» остаются на Board.

Миграции БД не нужны: статусы и `priority` уже в схеме.

## Проблема

| | HypothesesPage | Board Discover this feature |
|--|----------------|-----------------------------|
| Поля слева | insight, problem/solution + validation, MetricTagInput | те же |
| Status | `new \| inProgress \| accepted \| done \| rejected` | без `done` |
| Подпись inProgress | «In work» | «In Progress» |
| Priority | ввод 1–99, Save блокируется при ошибке | нет поля |
| Insert `priority` | да | нет (молчит default БД) |
| Правые действия | Create Feature, Attachments, Clone, Delete | только Status |

Таблица гипотез и сортировка по статусу/priority на HypothesesPage **не** дубль формы — остаются на странице.

## Цель

1. Один набор статусов и подписей.
2. Одна разметка полей формы (лево + status/priority справа).
3. Board открывает тот же редактор в режиме create-from-feature: priority есть, статус полный, связь с фичей видна и не меняется (как Linked Hypothesis в H2).
4. Действия только для существующей гипотезы (Create Feature, вложения, Clone, Delete) — слот на HypothesesPage, на Board их нет.

## Канон статусов

Источник правды — страница гипотез + `docs/general/hypotheses-page.md` (есть Done). Подпись `inProgress`: в доке «In Progress», в UI Hypotheses «In work». Для H3 взять **полный enum с HypothesesPage** и **одну** подпись.

Решение в реализации: `inProgress` → **«In Progress»** (как в `docs/general/hypotheses-page.md` и на Board). Таблица гипотез начнёт показывать то же, что селект. Если продукт сознательно хочет «In work» — заменить одну константу.

```ts
export const HYPOTHESIS_STATUSES = [
  { value: "new", label: "New" },
  { value: "inProgress", label: "In Progress" },
  { value: "accepted", label: "Accepted" },
  { value: "done", label: "Done" },
  { value: "rejected", label: "Rejected" },
] as const;

export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number]["value"];
export const DEFAULT_HYPOTHESIS_PRIORITY = 3;
```

Сортировка таблицы на HypothesesPage должна импортировать тот же порядок значений (сейчас локальный `statusOrder`).

## Вне скоупа

- H4 типы Feature/Goal на страницах.
- H5 колонки доски (`BOARD_COLUMNS`) — только статусы гипотез уходят в H3.
- H6 копирование вложений при update связи фича↔гипотеза (Discover this feature по-прежнему копирует feature→hypothesis в своей mutation).
- Вынос `saveHypothesisMutation` / `saveHypothesisFromFeatureMutation` в общий CRUD.
- Combobox Goal/Initiative (M4).

## Режимы формы

`mode: "page" | "create-from-feature"`

| | page (Hypotheses) | create-from-feature (Board) |
|--|-------------------|------------------------------|
| Title диалога | New / Edit Hypothesis | New Hypothesis (как сейчас) |
| Левые поля | общие | общие; prefills: insight = title фичи, problem_hypothesis = description |
| Status + Priority | общие | общие; status `new`, priority `3` |
| Linked Feature | нет | disabled-селектор, `min-w-0 truncate`, title = полное имя фичи (как H2) |
| Create Feature / Attachments / Clone / Delete | да, если есть `id` | нет |
| Save | insert/update гипотезы | insert гипотезы + update фичи (`hypothesis_id`, колонка discovery) + copy attachments |

Связь с фичей не редактируется: id фичи только из `creatingHypothesisFromFeature.featureId`.

## Шаг 1. `src/lib/hypotheses.ts`

- `HypothesisStatus`, `HYPOTHESIS_STATUSES`, `DEFAULT_HYPOTHESIS_PRIORITY`
- `parseHypothesisPriorityInput` — перенос из HypothesesPage без изменения правил (целое 1–99)
- `hypothesisStatusOrder: Record<HypothesisStatus, number>` для сортировки таблицы

Без React.

## Шаг 2. `src/components/HypothesisFormFields.tsx`

Контролируемый кусок, не диалог целиком:

- `value: Partial<HypothesisFormValue>`
- `onChange`
- `metricSuggestions: string[]`
- `priorityInput` / `onPriorityInputChange` / `priorityFieldError` — как сейчас на HypothesesPage (черновик строки отдельно от числа)
- `leftContent` = текстовые поля + MetricTagInput
- `rightMain` = Status select из `HYPOTHESIS_STATUSES` + Priority input

Страница сама кладёт это в `EntityDialog` left/right и добавляет свои кнопки под `rightMain`.

Тип формы (локально в компоненте или рядом):

```ts
{
  id?: string;
  status: HypothesisStatus;
  priority: number;
  insight: string;
  problem_hypothesis: string;
  problem_validation: string;
  solution_hypothesis: string;
  solution_validation: string;
  impact_metrics: string[];
}
```

Не тащить H4 `Tables<"hypotheses">` в этом шаге, если это раздует diff; достаточно этого типа в `src/lib/hypotheses.ts`.

Разметка полей — как на HypothesesPage (rows у textarea не менять).

## Шаг 3. HypothesesPage на общих полях

- Удалить локальные `type Status`, массив `statuses`, `parseHypothesisPriorityInput`.
- `interface Hypothesis` может остаться или alias на тип из lib.
- Таблица: сортировка через `hypothesisStatusOrder`; ячейка статуса — label из `HYPOTHESIS_STATUSES` (после смены «In work» → «In Progress»).
- `EntityDialog`: `leftContent` / status+priority из `HypothesisFormFields`; ниже — существующие Create Feature / Attachments / Clone.
- `saveDisabled` по `priorityFieldError` как сейчас.

## Шаг 4. Board: тот же редактор

- Удалить локальный урезанный `type Status` для гипотезы (ColumnId доски не трогать).
- Prefill: `status: "new"`, `priority: DEFAULT_HYPOTHESIS_PRIORITY`, плюс текущие insight/problem из фичи; завести `priorityInput` / `priorityFieldError` как на Hypotheses.
- Save блокируется при невалидном priority.
- Insert гипотезы **с** `priority`.
- Справа: Linked Feature (disabled, truncate, `min-w-0` — те же классы, что Linked Hypothesis в H2), затем status+priority. Без Create Feature / Clone / Attachments / Delete.
- Mutation link+discovery+copy attachments не выносить в lib.

`EntityDialog` уже сжимает колонки (`min-w-0`) — длинный title фичи не должен ломать сетку.

## Шаг 5. Проверка вручную

1. Hypotheses: New Hypothesis — все статусы включая Done, priority 3, валидация 1–99.
2. Таблица: статус «In Progress» (не «In work»); сортировка по статусу в том же порядке.
3. Edit: Create Feature / Clone / Attachments на месте.
4. Board → Discover this feature: форма как на Hypotheses (те же поля и статусы), Linked Feature серое с названием фичи (длинное — многоточие).
5. Save с Board: гипотеза с `priority` (по умолчанию 3), фича в Discovery, `hypothesis_id` проставлен, вложения скопированы.
6. С Hypotheses открыть эту гипотезу — priority и status совпадают с тем, что сохранили с Board.
7. Невалидный priority на Board — Save не проходит, как на Hypotheses.

## Критерий готовности H3

- Grep `In work` в `src/` пустой (если приняли «In Progress»).
- Массив статусов гипотезы и `parseHypothesisPriorityInput` только в `src/lib/hypotheses.ts`.
- Текстовые поля формы гипотезы только в `HypothesisFormFields.tsx`.
- Board insert гипотезы содержит `priority`.

## Оценка

Средний UI-рефакторинг без SQL. Риск — забыть priorityInput на Board и сломать Save. Шаг 1 независим; 3 и 4 после шага 2.

## Сводка по итогам

Сделано. `src/lib/hypotheses.ts` — `HYPOTHESIS_STATUSES` (inProgress → «In Progress»), `parseHypothesisPriorityInput`, `hypothesisStatusOrder`. `src/components/HypothesisFormFields.tsx` — левая колонка и status+priority. HypothesesPage и Board Discover this feature используют их. С Board: Linked Feature disabled, insert с `priority`, Save блокируется при невалидном 1–99. Create Feature / Clone / Attachments остались только на HypothesesPage.
