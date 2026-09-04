# План исправления M14: валидация приоритета инициативы

## Обзор

Гипотезы (и Discover на Board) после H3: строка в инпуте, `parseHypothesisPriorityInput` — целое **1–99**, ошибка в поле, Save заблокирован, toast «Invalid priority».

Инициативы на Strategy: `type="number"`, `parseInt(e.target.value) || 3`. Пустое и мусор становятся 3, верхнего предела нет, поле нельзя очистить чтобы набрать заново.

Дефолт **3** совпадает. Домен не общий: не вызывать `parseHypothesisPriorityInput` и не заводить `DEFAULT_PRIORITY` на оба. Своя константа и свой парсер рядом с инициативами.

Миграции не нужны. Колонка `initiatives.priority` уже integer NOT NULL DEFAULT 3.

## Проблема

| | Гипотезы | Инициативы (Strategy) |
|--|----------|------------------------|
| Ввод | строка `priorityInput` | `editingInitiative.priority` сразу number |
| Пусто / не число | ошибка, Save нельзя | `parseInt \|\| 3` |
| Диапазон | 1–99 | min={1} в HTML, 100+ проходит; `|| 3` глотает 0 |
| Сообщение | «Enter a whole number from 1 to 99» + toast при Save | нет |
| Дефолт | `DEFAULT_HYPOTHESIS_PRIORITY` | литерал `3` в create/edit/insert |

`docs/general/strategy-page.md` пишет «Integer, minimum 1» — это текущий UI, не 1–99.

## Цель

1. `DEFAULT_INITIATIVE_PRIORITY = 3` и `parseInitiativePriorityInput` (тот же контракт `{ ok, value }`, диапазон **1–99**).
2. Диалог инициативы: строковый инпут, ошибка в поле, `saveDisabled`, проверка на Save с тем же toast, что у гипотез (`Invalid priority` / «Enter a whole number from 1 to 99»).
3. Литералы `3` у приоритета инициативы заменить константой.
4. Не импортировать `parseHypothesisPriorityInput` / `HypothesisFormFields` на Strategy.

Пользователь: приоритет инициативы ведёт себя как приоритет гипотезы. Правило 1–99 фиксируем сознательно (одинаковый дефолт и смысл «меньше = важнее»); развести лимиты можно позже только в `initiatives.ts`.

## Канон

**Новый файл:** `src/lib/initiatives.ts` (как `hypotheses.ts`, без React). Не класть в `goals.ts`.

```ts
export const DEFAULT_INITIATIVE_PRIORITY = 3;

export function parseInitiativePriorityInput(
  raw: string,
): { ok: true; value: number } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 99) return { ok: false };
  return { ok: true, value: n };
}
```

Копия тела парсера гипотез **намеренная**. Общий `parsePriority1to99` не заводить.

**StrategyPage** — как Hypotheses:

- `initiativePriorityInput: string`, `initiativePriorityFieldError: boolean`.
- Create/edit: `setInitiativePriorityInput(String(DEFAULT_INITIATIVE_PRIORITY | initiative.priority))`, сбросить error.
- Insert: `priority: initiative.priority ?? DEFAULT_INITIATIVE_PRIORITY` (после успешного parse в Save).
- Инпут: `type="text"`, `inputMode="numeric"`, без spinner-классов. `onChange`: писать строку; если parse ok — ещё `priority` в `editingInitiative` и error false; иначе error true, number в стейте не обновлять.
- `saveInitiative`: после проверки имени — parse строки; `!ok` → error, toast Invalid priority, `return`. Иначе mutate с `priority: parsed.value`.
- `EntityDialog saveDisabled={initiativePriorityFieldError}` (имя по-прежнему ловится тостом, не disable).

Закрытие диалога без Save отбрасывает стейт, как сейчас.

## Где менять

- `src/lib/initiatives.ts` — константа + парсер.
- `src/pages/StrategyPage.tsx` — стейт поля, инпут, Save, заменить `3` / `|| 3` у priority.
- `docs/general/strategy-page.md` — Validation: целое 1–99; дефолт через константу по смыслу «3».
- `docs/general/data-model.md` — у инициатив одна строка: клиент принимает 1–99 (колонка в БД без CHECK — не ужесточать SQL).

Grep `parseInt(e.target.value)` на Strategy — пустой. `parseHypothesisPriorityInput` в Strategy — нет.

## Вне скоупа

- Менять парсер/поля гипотез и Discover.
- Общий модуль приоритета.
- CHECK 1–99 в Postgres.
- Валидация имени инициативы (уже есть).
- Сортировка таблицы (`compareByPriorityThenArchive`) — по-прежнему number из кэша.

## Шаг 1. `initiatives.ts`

Константа и парсер.

## Шаг 2. Диалог на Strategy

Стейт строки, инпут, Save, `saveDisabled`, константа вместо `3`.

## Шаг 3. Доки

strategy-page Validation; data-model — клиентский диапазон.

## Шаг 4. Проверка вручную

1. New Initiative: поле «3», Save с именем — priority 3.
2. Стереть поле — красная обводка, Save неактивен; Save всё же (если обойти disable) — toast, мутации нет.
3. `0`, `100`, `1.5`, `abc` — ошибка; `1` и `99` — ок.
4. Edit: приоритет 5, не менять — остаётся 5.
5. Закрыть диалог с битым вводом без Save — повторное открытие той же инициативы показывает сохранённое число.
6. Гипотезы: приоритет без регрессии.
7. `npx tsc --noEmit`.

## Критерий готовности M14

- Инициативы: 1–99, строковый ввод, ошибка в поле, без `parseInt \|\| 3`.
- `DEFAULT_INITIATIVE_PRIORITY` и `parseInitiativePriorityInput` не импортируют hypotheses.
- Гипотезы не затронуты.

## Оценка

Один маленький lib + диалог Strategy по образцу H3. Риск — импортировать парсер гипотез «чтобы не копировать»; план это запрещает. Второй — оставить `type="number"` и только min/max: пустое снова схлопнется. Нужен текстовый инпут.

## Итог

Сделано: `src/lib/initiatives.ts` — `DEFAULT_INITIATIVE_PRIORITY` и `parseInitiativePriorityInput` (1–99, копия тела гипотез, без импорта hypotheses). Strategy: строковый инпут, ошибка в поле, `saveDisabled`, toast Invalid priority. Литералы `3` / `|| 3` у priority заменены константой. `strategy-page.md` и `data-model.md` обновлены.
