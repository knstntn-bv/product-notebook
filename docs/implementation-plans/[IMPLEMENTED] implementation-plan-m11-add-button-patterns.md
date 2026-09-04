# План исправления M11: три места для кнопки «добавить» — правило, не новый компонент

## Обзор

На страницах три разных способа «добавить», и это **не баг**. Канбан и таблица роадмапа добавляют сущность *в конкретную колонку/ячейку*; Strategy добавляет *внутрь секции*; Hypotheses и Attachments — *одно действие на всю страницу*, его логично держать в шапке рядом с названием.

Склеивать `HeaderActions`, `SectionHeader` и Plus-кнопку ячейки в один виджет нельзя: разный якорь, разный смысл `onAdd` (есть колонка / нет / четыре сущности на одном экране). AutoResizeTextarea — L2, не сюда.

Код страниц не перекладывать. Работа M11 — **зафиксировать правило в документации**, чтобы следующий рефактор не «выровнял» Board под шапку.

Миграции не нужны.

## Проблема

| Паттерн | Где | Зачем так |
|---------|-----|-----------|
| `HeaderActions` → портал в `HeaderActionsSlot` шапки | Hypotheses («Add Hypothesis»), Attachments («Upload») | Одно действие на маршрут; слот уже в `AppLayout` |
| `SectionHeader` + опциональный `onAdd` | Strategy: Values / Metrics / Initiatives. Formula — тот же заголовок **без** Add | Четыре блока на одной странице; Add принадлежит секции |
| Кнопка в контексте сетки | Roadmap: outline «Add Goal» + Plus в ячейке initiative×quarter. Board: «Add» в шапке колонки (`DroppableColumn`) | Нужен id колонки/ячейки; глобальная Add Feature / Add Goal некуда класть |

Не путать с кнопками **внутри диалога** (Create Feature с гипотезы, Upload в `EntityAttachmentsDialog`) — это не page-level Add.

Сейчас правило нигде не записано. `docs/general/main-application.md` описывает шапку (Settings / Profile), слот страничных действий не назван. Hypotheses: «кнопка at the top» — не сказано, что это шапка приложения.

## Цель

1. В `docs/general/main-application.md` — секция: три паттерна, когда какой, чего не делать.
2. На страницах — одна отсылка, без копипасты таблицы.
3. `src/` не менять: не общий `AddButton`, не перенос Strategy Add в шапку, не HeaderActions на Board/Roadmap.

Поведение UI не меняется. Критерий готовности — документ, который можно открыть вместо «давайте унифицируем кнопки».

## Канон (текст для доки)

**Page-level (одно действие на маршрут):** обёртка `HeaderActions` вокруг `Button size="sm"`. Рендер в слот шапки (`HeaderActionsSlot` в `AppLayout`). Сейчас: Add Hypothesis, Upload.

**Секция на составной странице:** `SectionHeader` (`title`, `description?`, `onAdd?`, `addLabel?`). Add только если у секции есть создание строки. Formula — без `onAdd`. Не порталить эти кнопки в шапку (четыре разных mutate).

**Ячейка / колонка:** локальная `Button` у Roadmap-ячейки и у колонки Board. Колбэк получает `columnId` / `(initiativeId, quarter)`. Не заводить `HeaderActions` «Add Feature».

Не делать:

- один компонент на все три якоря;
- Add Values/Metrics/Initiatives в шапку Strategy;
- прятать Board/Roadmap Add в шапку;
- тащить сюда иконки диалогов (Plus у Create Feature, Upload в попапе вложений).

## Где менять

Только Markdown:

- **`docs/general/main-application.md`** — после описания Header: слот `HeaderActionsSlot`; таблица трёх паттернов и запреты. Компоненты: `HeaderActions.tsx`, `SectionHeader.tsx`, `AppLayout.tsx`.
- **`docs/general/hypotheses-page.md`** / **`attachments-page.md`** — Add/Upload идут в шапку через `HeaderActions` (ссылка на main-application).
- **`docs/general/strategy-page.md`** — Add у секции через `SectionHeader`; Formula без Add.
- **`docs/general/board-page.md`** / **`roadmap-page.md`** — Add на колонке / в ячейке, не в шапке.

Короткая отсылка, без повторения всей таблицы.

JSDoc у `HeaderActions` / `HeaderActionsSlot` уже говорит «page-level / app header». Не дублировать правило в комментариях кода.

## Вне скоупа

- Любые правки `src/` (в т.ч. неиспользуемый `Plus` в импорте Board, если остался).
- L2: AutoResizeTextarea.
- Визуально выровнять «Add» колонки Board и «Add Goal» ячейки (outline / без иконки).
- HeaderActions для Settings — уже отдельные кнопки шапки.
- Новый `docs/general/ui-*.md` — достаточно секции в main-application.

## Шаг 1. Правило в `main-application.md`

Секция вроде «Page actions». Таблица + запреты из канона.

## Шаг 2. Отсылки на страницах

Пять файлов `docs/general/*-page.md` из списка выше.

## Шаг 3. Проверка

1. Код страниц и шапки не в diff.
2. По тексту ясно: Hypotheses/Attachments — шапка; Strategy — секция; Board/Roadmap — колонка/ячейка.
3. Нет предложения склеить компоненты.

## Критерий готовности M11

- Правило лежит в `docs/general/main-application.md`.
- Страничные доки не противоречат ему.
- Нет нового общего Add-компонента и нет переноса кнопок.

## Оценка

Только документация. Риск — при «внедряй» начать рефакторить UI «для порядка»; план это запрещает. Второй риск — описать только HeaderActions и забыть ячейки; таблица в шаге 1 это закрывает.

## Итог

Сделано: секция Page actions в `docs/general/main-application.md`. Hypotheses, Attachments, Strategy, Board и Roadmap ссылаются на неё. `src/` без изменений.
