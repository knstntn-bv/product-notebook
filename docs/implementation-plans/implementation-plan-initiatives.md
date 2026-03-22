# План реализации задач ESS-63, ESS-64, NEW

## Обзор задач
- **ESS-63**: Указание целевой метрики для инициативы
- **ESS-64**: Новый редактор инициативы (попап вместо inline)
- **NEW**: Возможность указать порядок инициатив (приоритет)

## Шаги выполнения

### Шаг 1: Миграция базы данных
**Файл**: `supabase/migrations/[timestamp]_add_initiative_fields.sql`

1. Добавить поле `target_metric_id` (UUID, nullable, FK на metrics.id)
2. Добавить поле `priority` (integer, NOT NULL, DEFAULT 3)
3. Добавить внешний ключ для `target_metric_id`
4. Обновить существующие записи: установить `priority = 3` для всех инициатив

**SQL:**
```sql
ALTER TABLE public.initiatives 
  ADD COLUMN target_metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL,
  ADD COLUMN priority integer NOT NULL DEFAULT 3;

UPDATE public.initiatives SET priority = 3 WHERE priority IS NULL;
```

---

### Шаг 2: Генерация типов Supabase
**Файл**: `src/integrations/supabase/types.ts`

#### Что это такое?

После изменения схемы базы данных (добавления полей `target_metric_id` и `priority` в таблицу `initiatives`) нужно обновить TypeScript типы, чтобы TypeScript знал о новых полях.

Файл `src/integrations/supabase/types.ts` содержит автоматически сгенерированные типы, которые соответствуют структуре вашей базы данных. Этот файл используется для типобезопасности при работе с Supabase клиентом.

#### Зачем это нужно?

Без обновления типов:
- TypeScript не будет знать о новых полях `target_metric_id` и `priority`
- При попытке использовать эти поля в коде будут ошибки типизации
- Автодополнение в IDE не будет работать для новых полей

#### Как выполнить?

**Вариант 1: Если используете Supabase CLI локально**
```bash
# Убедитесь, что локальный Supabase запущен
supabase start

# Сгенерировать типы из локальной БД
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

**Вариант 2: Если используете удаленный проект Supabase**
```bash
# Нужно получить project_id из supabase/config.toml или из настроек проекта
# И иметь SUPABASE_ACCESS_TOKEN в переменных окружения

npx supabase gen types typescript --project-id hdrkyvztkbzigfjdbg > src/integrations/supabase/types.ts
```

**Вариант 3: Ручное обновление (не рекомендуется, но возможно)**

Если автоматическая генерация недоступна, можно вручную добавить поля в типы:

В секции `initiatives.Row` добавить:
```typescript
target_metric_id: string | null
priority: number
```

В секции `initiatives.Insert` добавить:
```typescript
target_metric_id?: string | null
priority?: number
```

В секции `initiatives.Update` добавить:
```typescript
target_metric_id?: string | null
priority?: number
```

В секцию `initiatives.Relationships` добавить:
```typescript
{
  foreignKeyName: "initiatives_target_metric_id_fkey"
  columns: ["target_metric_id"]
  isOneToOne: false
  referencedRelation: "metrics"
  referencedColumns: ["id"]
}
```

#### Что должно получиться?

После генерации в типе `initiatives.Row` должны появиться:
- `target_metric_id: string | null`
- `priority: number`

И соответствующие поля в `Insert` и `Update` типах.

#### Проверка

После генерации откройте `src/integrations/supabase/types.ts` и проверьте, что в секции `initiatives` есть новые поля. Также можно проверить, что TypeScript не выдает ошибок при использовании этих полей в коде.

---

### Шаг 3: Обновление TypeScript типов
**Файлы**: 
- `src/integrations/supabase/types.ts` (автогенерация после миграции)
- `src/contexts/ProductContext.tsx`
- `src/pages/StrategyPage.tsx`
- `src/pages/BoardPage.tsx`
- `src/pages/RoadmapPage.tsx`
- `src/pages/HypothesesPage.tsx`

1. Обновить интерфейс `Initiative` в `ProductContext.tsx`:
   - Добавить `target_metric_id?: string | null`
   - Добавить `priority: number`

2. Обновить интерфейсы `Initiative` в других файлах (если есть локальные определения)

---

### Шаг 4: Обновление ProductContext
**Файл**: `src/contexts/ProductContext.tsx`

1. Обновить запрос инициатив: изменить сортировку с `created_at` на `priority ASC`
2. Обновить интерфейс `Initiative` (см. Шаг 3)

---

### Шаг 5: Создание редактора инициативы
**Файл**: `src/pages/StrategyPage.tsx`

1. Добавить состояние для редактора:
   - `editingInitiative` (для хранения редактируемой инициативы)
   - `isInitiativeDialogOpen` (для управления открытием/закрытием)

2. Создать компонент редактора на базе `EntityDialog`:
   - **Левая колонка** (`leftContent`):
     - Поле "Название" (Input)
     - Поле "Описание" (Textarea)
   - **Правая колонка** (`rightContent`):
     - Поле "Приоритет" (Input type="number", min=1)
     - Поле "Целевая метрика" (Select с опцией "None" и списком метрик)
     - ColorPicker для выбора цвета
   - Кнопки: Save, Cancel, Archive, Delete

3. Обновить мутации:
   - `addInitiativeMutation`: добавить `priority: 3` по умолчанию
   - `updateInitiativeMutation`: добавить поддержку `target_metric_id` и `priority`

---

### Шаг 6: Замена inline-редактирования на попап
**Файл**: `src/pages/StrategyPage.tsx`

1. Удалить inline-редактирование:
   - Удалить состояние `editingInitiatives`
   - Удалить inline-компоненты (InlineEditInput, AutoResizeTextarea, ColorPicker из таблицы)
   - Удалить кнопку "Save" из таблицы

2. Добавить кнопку редактирования в таблице:
   - Кнопка с иконкой Pencil для открытия редактора
   - При клике открывать попап с данными инициативы

3. Обновить таблицу:
   - Добавить колонку "Target Metric" (отображать название метрики или "—")
   - Изменить сортировку: сначала по `priority ASC`, затем по `archived` (неархивные сначала)
   - Убрать inline-редактирование, оставить только отображение

---

### Шаг 7: Обновление страницы Roadmap
**Файл**: `src/pages/RoadmapPage.tsx`

1. Обновить сортировку инициатив:
   - Изменить сортировку в таблице: сначала по `priority ASC`, затем по `archived`
   - Обновить логику сортировки в `.sort()` для инициатив

2. Обновить интерфейс `Initiative` (если есть локальное определение)

---

### Шаг 8: Обновление других страниц
**Файлы**: 
- `src/pages/BoardPage.tsx`
- `src/pages/HypothesesPage.tsx`

1. Обновить интерфейсы `Initiative` (если есть локальные определения)
2. Убедиться, что новые поля не ломают существующую логику

---

### Шаг 9: Тестирование

1. **Создание инициативы:**
   - Создать новую инициативу через попап
   - Проверить, что priority = 3 по умолчанию
   - Проверить, что можно указать целевую метрику

2. **Редактирование инициативы:**
   - Открыть редактор существующей инициативы
   - Изменить приоритет
   - Изменить целевую метрику
   - Сохранить и проверить изменения

3. **Сортировка:**
   - Создать несколько инициатив с разными приоритетами
   - Проверить сортировку на странице Strategy (по priority ASC)
   - Проверить сортировку на странице Roadmap (по priority ASC)

4. **Отображение метрики:**
   - Установить целевую метрику для инициативы
   - Проверить отображение в таблице на странице Strategy

5. **Архивирование:**
   - Архивировать инициативу через редактор
   - Проверить, что архивные инициативы отображаются в конце списка

---

## Порядок выполнения (рекомендуемый)

1. ✅ Шаг 1: Миграция БД
2. ✅ Шаг 2: Генерация типов Supabase (сразу после миграции!)
3. ✅ Шаг 3: Обновление TypeScript типов
4. ✅ Шаг 4: Обновление ProductContext
5. ✅ Шаг 5: Создание редактора инициативы
6. ✅ Шаг 6: Замена inline-редактирования
7. ✅ Шаг 7: Обновление Roadmap
8. ✅ Шаг 8: Обновление других страниц
9. ✅ Шаг 9: Тестирование

**Важно:** Шаг 2 (генерация типов) должен выполняться сразу после шага 1 (миграция), так как без обновленных типов TypeScript не будет знать о новых полях и будет выдавать ошибки при работе с кодом.

---

## Заметки

- Приоритет: число, меньшее значение = выше приоритет
- Целевая метрика: необязательное поле, можно оставить пустым
- Редактор использует двухколоночный layout из EntityDialog
- Сортировка: сначала по priority ASC, затем неархивные перед архивными

