# План реализации: привязка вложений к гипотезам и фичам

**Требование:** `feature_requests/NEW Привязка вложений к гипотезам и фичам.md`  
**Опора:** библиотека вложений уже есть (`attachments`, Storage, `/attachments`).

## Обзор

Связь many-to-many через две junction-таблицы. UI: попап из редакторов гипотезы и фичи (открепить, не удалять). Удаление файла из библиотеки снимает все связи каскадом. Создание фичи из гипотезы, гипотезы из фичи и клон гипотезы копируют связи.

## Допущения

1. Попап вложений доступен только у **уже сохранённой** сущности (есть `id`) — как Clone / Create Feature. У черновика «Add Hypothesis» кнопки нет; после сохранения — есть.
2. Диалоги «Create Feature from Hypothesis» и «Discovery this feature» попап не открывают: связи копируются **в момент insert**.
3. ~~Ручная смена `features.hypothesis_id` вложения не трогает.~~ Перекрыто H6: при установке или смене связи копируются ссылки в обе стороны (`syncAttachmentLinksForFeatureHypothesis`). None и повторный save с тем же id ссылки не трогают.
4. Вложенный Dialog поверх `EntityDialog` допустим (Radix). Если фокус/оверлей сломаются — вынести попап в `Dialog` с более высоким `z-index` или в `Sheet`.
5. Логику «загрузить или взять существующий по хешу» вынести из `AttachmentsPage` в общий хелпер: в попапе дубль должен **прикрепляться**, на странице библиотеки по-прежнему только тост без второй копии.

---

### Шаг 1. Миграция junction-таблиц

**Файл:** `supabase/migrations/YYYYMMDDHHMMSS_add_attachment_links.sql`  
Также: `final_full_schema.sql`, откат в комментарии миграции.

**Таблицы:**

- `hypothesis_attachments` (`hypothesis_id`, `attachment_id`, `created_at`)
- `feature_attachments` (`feature_id`, `attachment_id`, `created_at`)

**Ограничения:**

- PK / UNIQUE `(hypothesis_id, attachment_id)` и `(feature_id, attachment_id)`
- FK на `hypotheses` / `features` / `attachments` с **`ON DELETE CASCADE`**
  - удаление гипотезы/фичи → только связи, файл остаётся
  - удаление вложения из библиотеки → все связи снимаются сами (в т.ч. «архивные»)
- Индексы по `attachment_id` (пометки в библиотеке: «есть ли хоть одна гипотеза / фича»)

**Одинаковый продукт:** триггер `BEFORE INSERT OR UPDATE`: `attachments.product_id` = `hypotheses.product_id` (и то же для фич). Иначе можно привязать чужой файл по UUID.

**RLS:** SELECT/INSERT/DELETE, если пользователь владеет продуктом гипотезы/фичи (как у остальных таблиц, через `products.user_id`). UPDATE не нужен.

Полиморфную таблицу «тип + id» не делать.

**Проверка:** миграция применяется; удаление тестового `attachments` удаляет строки связей; удаление гипотезы связи снимает, строка в `attachments` жива.

---

### Шаг 2. Типы клиента

**Файл:** `src/integrations/supabase/types.ts`

Добавить `hypothesis_attachments` и `feature_attachments` (`Row` / `Insert` / `Update` / `Relationships`).

---

### Шаг 3. Общий код загрузки и копирования связей

**Файлы:** `src/lib/attachments.ts` (расширить) и/или `src/lib/attachmentLinks.ts`

Вынести из `AttachmentsPage`:

- загрузка в Storage + insert **или** существующий id по `(product_id, content_hash)`
- на странице библиотеки при дубле — по-прежнему не создавать объект и показать тост
- в попапе при дубле — вернуть id существующего и прикрепить

Добавить:

- `attachToHypothesis` / `detachFromHypothesis` (и то же для фич)
- `copyHypothesisAttachments(fromId, toId)` / `copyFeatureAttachments` / копирование **между** гипотезой и фичей (те же `attachment_id`)

`AttachmentsPage` перевести на общий upload-хелпер, поведение библиотеки не менять, кроме дальнейшего шага с пометками.

---

### Шаг 4. Попап управления вложениями сущности

**Новый файл:** например `src/components/EntityAttachmentsDialog.tsx`

Пропсы: `open`, `onOpenChange`, `productId`, вид сущности (`hypothesis` | `feature`), `entityId`.

Содержимое:

- список прикреплённых (имя, размер, скачать, **Detach**)
- прикрепить из библиотеки продукта (файлы, ещё не связанные с этой сущностью)
- Upload — тот же пайплайн, что в библиотеке; дубль по хешу → прикрепить существующий
- кнопки удаления файла из продукта **нет**

Данные: React Query, ключи вида `["hypothesis_attachments", entityId]`, инвалидация `["attachments", productId]` после attach/detach/upload.

**Проверка:** вложенный диалог открывается из `EntityDialog`, закрытие попапа не закрывает редактор.

---

### Шаг 5. Редактор гипотезы

**Файл:** `src/pages/HypothesesPage.tsx`

В правой колонке редактора (рядом с Clone / Create Feature), только если есть `editingHypothesis.id`:

- кнопка (например Attachments), открывает попап с `entityId` гипотезы.

Создание новой гипотезы без id — кнопку не показывать.

---

### Шаг 6. Редактор фичи

**Файл:** `src/pages/BoardPage.tsx`

То же в правой колонке редактора фичи, только если есть `editingFeature.id`.

Диалог Discovery (создание гипотезы) не расширять попапом.

---

### Шаг 7. Наследование связей

Все insert, которые создают новую сущность из другой, должны получать новый `id` через `.select().single()` (клон гипотезы сейчас id не возвращает).

| Сценарий | Где | Что копировать |
|----------|-----|----------------|
| Clone гипотезы | `cloneHypothesisMutation` в `HypothesesPage.tsx` | `hypothesis_attachments` → новая гипотеза |
| Create Feature from Hypothesis | `createFeatureMutation` в `HypothesesPage.tsx` | связи исходной гипотезы → новая фича |
| Discovery this feature | `saveHypothesisFromFeatureMutation` в `BoardPage.tsx` | связи исходной фичи → новая гипотеза |

Копировать только `attachment_id`, без новых объектов Storage.

**Не** копировать при ручном выборе/сбросе Linked Hypothesis.

**Проверка:** клон с тремя файлами → у клона те же три; Create Feature → у фичи те же; Discovery → у новой гипотезы те же, что у фичи; смена линка в комбобоксе список вложений не меняет.

---

### Шаг 8. Библиотека: пометки и удаление

**Файл:** `src/pages/AttachmentsPage.tsx`

- Для списка продукта: есть ли связи в `hypothesis_attachments` / `feature_attachments` (два независимых признака: badges или колонки Linked to hypotheses / Linked to features). Перечень id сущностей не показывать.
- Удаление: как сейчас (Storage, затем строка `attachments`). Каскад в БД снимает связи; после успеха инвалидировать и ключи связей.

---

### Шаг 9. Документация и чеклист

- `docs/general/data-model.md` — junction, каскады, тот же продукт
- `docs/general/hypotheses-page.md` — попап, клон, Create Feature
- `docs/general/board-page.md` — попап, Discovery
- страница вложений: новый `docs/general/attachments-page.md` (библиотека + пометки + каскадное отцепление) и ссылка из `docs/general/main-application.md`
- `docs/testing-checklists/testing-checklist-attachment-links.md`

Сценарии чеклиста: прикрепить из библиотеки; загрузить новый; дубль → прикрепить существующий; отцепить в попапе (файл в библиотеке остался); удалить в библиотеке (связи пропали у гипотезы и у фичи); клон; Create Feature; Discovery; ручной линк гипотезы не копирует файлы; кнопка только у сохранённой сущности.

---

## Порядок и зависимости

```
1 схема → 2 типы → 3 хелперы → 4 попап → 5+6 редакторы (можно параллельно)
                                      → 7 наследование (после хелперов копирования)
                                      → 8 пометки в библиотеке
                                      → 9 доки
```

Шаги 5 и 6 независимы после шага 4. Шаг 8 можно делать сразу после шага 1 (каскад уже работает), пометки — после появления связей в UI удобнее проверять.

## Вне этого плана

Цели, превью, теги, правка `.md`, опция «клон без вложений», блокировка удаления при живых связях.
