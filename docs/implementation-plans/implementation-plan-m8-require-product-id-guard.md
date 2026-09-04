# План исправления M8: guard записи — `requireProductId`, не `user`

## Обзор

`user_id` с таблиц данных снят давно. H7 сделал каноном записи `requireProductId` + `.eq("product_id")`. Часть `mutationFn` всё ещё начинает с `if (!user) throw new Error("No user")`, хотя `user` в payload не пишется. Соседние мутации (archive, drag, delete гипотезы, Discover) этой проверки уже нет.

Сессия закрывается `ProtectedRoute` и RLS (`products.user_id = auth.uid()`). Клиентский guard продукта — есть ли `currentProductId`. Две проверки дублируют смысл и дают разный текст ошибки («No user» vs «No product selected») на одном экране.

Миграции не нужны. RLS не трогать.

## Проблема

Осталось 8 вызовов `if (!user)` в мутациях:

| Файл | Мутации |
|------|---------|
| Strategy | formula upsert; add value; add metric |
| Roadmap | save goal; delete goal |
| Board | save feature; delete feature |
| Hypotheses | save hypothesis |

Там же часто сразу `requireProductId` или ручной `if (!currentProductId)`. `user` после throw нигде не используется.

Тот же throw «No product selected» вручную (не через хелпер): formula/add value/add metric; clone и create feature на Hypotheses; upload на Attachments.

Не этот пункт:

| Место | Почему |
|-------|--------|
| `ProtectedRoute` | редирект на `/auth` |
| `ProductContext` `effectiveUserId` | выбор продукта по `user_id` |
| `setShowArchived`: `if (!user \|\| !currentProductId)` | Settings / M13 |
| `SidebarToggleButtons` / Auth | UI сессии |

## Цель

1. С `mutationFn` снять `if (!user)`.
2. Перед записью — только `const productId = requireProductId(currentProductId)`; в insert/upsert подставлять `productId`.
3. С страниц Strategy / Roadmap / Board / Hypotheses убрать `useAuth`, если `user` больше не нужен.
4. Ручной `if (!currentProductId) throw new Error("No product selected")` в тех же мутациях (и upload Attachments) заменить на `requireProductId` — один текст, один хелпер.

Поведение при выбранном продукте не меняется. Нет продукта — по-прежнему throw и `errorToast` с «No product selected», не «No user».

## Канон

Как уже у update/delete и Discover:

```ts
mutationFn: async (...) => {
  const productId = requireProductId(currentProductId);
  const { error } = await supabase
    .from("…")
    .insert({ product_id: productId, … });
  if (error) throw error;
},
```

Не писать `user_id` в payload. Не проверять `user` «на всякий случай» рядом с `requireProductId`.

## Где менять

Снять строку `if (!user)` и лишний импорт `useAuth`:

- `StrategyPage`: formula, addValue, addMetric — вместо пары `user` + `if (!currentProductId)` один `requireProductId`. Update/delete values/metrics/initiatives уже так.
- `RoadmapPage`: save/delete goal. Archive и move уже без `user`.
- `BoardPage`: save/delete feature. Drag и Discover уже без `user`.
- `HypothesesPage`: save hypothesis. Delete уже без `user`.

Выровнять на `requireProductId` (тот же throw):

- Hypotheses: clone, create feature.
- Attachments: `uploadMutation` (сейчас ручная проверка; delete уже через хелпер).

Grep `if (!user)` в `src/pages/` — пустой. `No user` в `src/` — только не страницы данных (если вообще останется). `throw new Error("No product selected")` вне `requireProductId` — пустой в `src/pages/` и `src/components/`.

## Вне скоупа

- M13: `setShowArchived` и Settings.
- M15: два `onAuthStateChange`.
- Менять RLS или политики.
- `ProtectedRoute`, `AuthPage`, `AuthContext`.
- Фантомный `useCrudMutations.ts` (удалён в M1).

Документы не нужны: контракт записи уже `product_id` (H7 / `data-model.md`).

## Шаг 1. Четыре страницы сущностей

Удалить `if (!user)` и неиспользуемый `useAuth`. Formula / insert values / insert metrics перевести на `requireProductId`.

## Шаг 2. Оставшиеся ручные throw

Clone, create feature, upload Attachments.

## Шаг 3. Проверка вручную

1. Залогинен, продукт выбран: save фичи / цели / гипотезы / формулы / add metric — как сейчас.
2. Нет продукта (если воспроизвести): toast «No product selected», не «No user».
3. Archive, drag, Discover — без регрессии (их не переписываем, кроме отсутствия `user` на странице).
4. Sign out с защищённого маршрута — по-прежнему редирект `ProtectedRoute`.
5. `npx tsc --noEmit`.

## Критерий готовности M8

- В `mutationFn` страниц нет проверки `user`.
- Guard записи — `requireProductId`.
- `useAuth` на Strategy / Roadmap / Board / Hypotheses нет.
- Auth-обвязка и контекст продукта не сломаны.

## Оценка

Механическое удаление мёртвых строк плюс замена трёх insert на хелпер. Риск — снять `useAuth` со страницы, где `user` ещё читается; grep после шага 1 это ловит. Не трогать `ProtectedRoute`.

## Итог

Сделано: `if (!user)` снят с мутаций. `requireProductId` на formula/insert, clone, create feature и upload. `useAuth` убран со Strategy / Roadmap / Board / Hypotheses. `ProtectedRoute` без изменений.
