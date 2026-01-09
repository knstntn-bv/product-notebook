# План реализации: Приоритеты гипотез и обновление сортировки по статусам

## Обзор

Реализация двух требований одновременно:
- **ESS-62**: Обновление структуры статусов гипотез (порядок статусов, улучшенная сортировка)
- **NEW**: Возможность задать приоритеты для гипотез

## Шаг 1: Миграция базы данных - добавление статуса "done" и поля priority

### 1.1 Создание файла миграции
- **Файл**: `supabase/migrations/YYYYMMDDHHMMSS_add_done_status_and_priority_to_hypotheses.sql`
- **Действия**:
  1. Добавить новый статус "done" в CHECK constraint таблицы `hypotheses`
  2. Добавить колонку `priority` типа `integer` в таблицу `hypotheses`
  3. Установить `NOT NULL DEFAULT 3` для `priority`
  4. Обновить существующие записи, установив `priority = 3` для всех записей, где `priority IS NULL` (на всякий случай)

### 1.2 SQL миграции
```sql
-- Step 1: Add new status "done" to the CHECK constraint
-- First, drop the existing constraint
ALTER TABLE public.hypotheses 
  DROP CONSTRAINT IF EXISTS hypotheses_status_check;

-- Add the new constraint with "done" status included
ALTER TABLE public.hypotheses 
  ADD CONSTRAINT hypotheses_status_check 
  CHECK (status IN ('new', 'inProgress', 'accepted', 'done', 'rejected'));

-- Step 2: Add priority field to hypotheses table
ALTER TABLE public.hypotheses 
  ADD COLUMN priority integer NOT NULL DEFAULT 3;

-- Update existing records to ensure they all have priority = 3
UPDATE public.hypotheses 
SET priority = 3 
WHERE priority IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.hypotheses.priority IS 'Priority of the hypothesis (numeric, default 3)';
COMMENT ON COLUMN public.hypotheses.status IS 'Status of the hypothesis: new, inProgress, accepted, done, rejected';
```

### 1.3 Обновление финальной схемы
- **Файл**: `supabase/migrations/final_full_schema.sql`
- **Действия**:
  - Обновить CHECK constraint для `status`: `CHECK (status IN ('new', 'inProgress', 'accepted', 'done', 'rejected'))`
  - Добавить поле `priority integer NOT NULL DEFAULT 3` в определение таблицы `hypotheses`

---

## Шаг 2: Обновление TypeScript типов

### 2.1 Обновление типа Status
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: строка 23
- **Действия**:
  - Обновить тип `Status`, добавив `"done"`:
    ```typescript
    type Status = "new" | "inProgress" | "accepted" | "done" | "rejected";
    ```

### 2.2 Обновление интерфейса Hypothesis
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Действия**:
  - Добавить поле `priority: number` в интерфейс `Hypothesis` (строка 26-35)
  - Обновить тип `editingHypothesis` для поддержки `priority`

### 2.3 Обновление типов Supabase (автоматически)
- **Файл**: `src/integrations/supabase/types.ts`
- **Действия**: 
  - После применения миграции запустить генерацию типов (если используется CLI)
  - Или вручную:
    - Добавить `priority: number` в `hypotheses.Row`, `hypotheses.Insert`, `hypotheses.Update`
    - Обновить тип `status` для поддержки значения `"done"`

---

## Шаг 3: Обновление порядка статусов (ESS-62)

### 3.1 Обновление порядка статусов в коде
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: массив `statuses` (строки 90-95)
- **Действия**:
  - Обновить массив `statuses` согласно требованиям: `New → In work → Accepted → Done → Rejected`
  - Порядок должен быть:
    ```typescript
    const statuses: { value: Status; label: string }[] = [
      { value: "new", label: "New" },
      { value: "inProgress", label: "In work" },
      { value: "accepted", label: "Accepted" },
      { value: "done", label: "Done" },
      { value: "rejected", label: "Rejected" },
    ];
    ```

### 3.2 Обновление объекта statusOrder для сортировки
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: объект `statusOrder` в функции `sortedHypotheses` (строки 378-383)
- **Действия**:
  - Обновить порядок согласно требованиям (5 статусов):
    ```typescript
    const statusOrder: Record<Status, number> = {
      new: 1,        // New
      inProgress: 2, // In work
      accepted: 3,   // Accepted
      done: 4,       // Done
      rejected: 5,   // Rejected
    };
    ```

---

## Шаг 4: Добавление сортировки по приоритету

### 4.1 Добавление состояния для сортировки по приоритету
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: после строки 70 (где объявлен `statusSort`)
- **Действия**:
  - Добавить: `const [prioritySort, setPrioritySort] = useState<"asc" | "desc" | null>(null);`

### 4.2 Создание обработчика сортировки по приоритету
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: после функции `handleStatusSort` (после строки 373)
- **Действия**:
  - Добавить функцию `handlePrioritySort` аналогично `handleStatusSort`:
    ```typescript
    const handlePrioritySort = () => {
      if (prioritySort === null) {
        setPrioritySort("asc");
      } else if (prioritySort === "asc") {
        setPrioritySort("desc");
      } else {
        setPrioritySort(null);
      }
    };
    ```

### 4.3 Обновление логики сортировки
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: функция `sortedHypotheses` (строки 375-387)
- **Действия**:
  - Полностью переписать логику сортировки для поддержки:
    1. Сортировки по приоритету (если активна)
    2. Вторичной сортировки по статусу (если приоритеты равны)
    3. Сортировки по статусу (если активна)
    4. Вторичной сортировки по приоритету (если статусы равны)
    5. Если обе сортировки неактивны - возвращать исходный порядок

  - **Новая логика**:
    ```typescript
    const sortedHypotheses = [...hypotheses].sort((a, b) => {
      // Если активна сортировка по приоритету
      if (prioritySort !== null) {
        const priorityComparison = (a.priority || 3) - (b.priority || 3);
        if (priorityComparison !== 0) {
          return prioritySort === "asc" ? priorityComparison : -priorityComparison;
        }
        // Если приоритеты равны, сортируем по статусу (если активна сортировка по статусу)
        if (statusSort !== null) {
          const statusOrder: Record<Status, number> = {
            new: 1,
            inProgress: 2,
            accepted: 3,
            done: 4,
            rejected: 5,
          };
          const statusComparison = statusOrder[a.status] - statusOrder[b.status];
          return statusSort === "asc" ? statusComparison : -statusComparison;
        }
        return 0;
      }
      
      // Если активна сортировка по статусу
      if (statusSort !== null) {
        const statusOrder: Record<Status, number> = {
          new: 1,
          inProgress: 2,
          accepted: 3,
          done: 4,
          rejected: 5,
        };
        const statusComparison = statusOrder[a.status] - statusOrder[b.status];
        if (statusComparison !== 0) {
          return statusSort === "asc" ? statusComparison : -statusComparison;
        }
        // Если статусы равны, сортируем по приоритету
        const priorityComparison = (a.priority || 3) - (b.priority || 3);
        return priorityComparison;
      }
      
      // Если сортировка неактивна
      return 0;
    });
    ```

---

## Шаг 5: Обновление запросов к базе данных

### 5.1 Обновление запроса получения гипотез
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `useQuery` для hypotheses (строки 98-121)
- **Действия**:
  - Добавить `priority` в маппинг данных (строка 109-118):
    ```typescript
    return (data || []).map((h: any) => ({
      id: h.id,
      status: h.status as Status,
      priority: h.priority ?? 3, // Добавить priority
      insight: h.insight || "",
      // ... остальные поля
    })) as Hypothesis[];
    ```

### 5.2 Обновление мутации создания гипотезы
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `saveHypothesisMutation` (строки 138-184)
- **Действия**:
  - В блоке `if (hypothesis.id)` (update) добавить:
    ```typescript
    if (hypothesis.priority !== undefined) updates.priority = hypothesis.priority;
    ```
  - В блоке `else` (create) добавить в `insert`:
    ```typescript
    priority: hypothesis.priority ?? 3,
    ```

### 5.3 Обновление мутации клонирования гипотезы
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `cloneHypothesisMutation` (строки 205-234)
- **Действия**:
  - Добавить `priority: hypothesis.priority ?? 3` в `insert`

### 5.4 Обновление функции handleAddHypothesis
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `handleAddHypothesis` (строки 124-135)
- **Действия**:
  - Добавить `priority: 3` в начальное состояние `editingHypothesis`

### 5.5 Обновление функции handleCloneHypothesis
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `handleCloneHypothesis` (строки 399-416)
- **Действия**:
  - Добавить `priority: editingHypothesis.priority ?? 3` в объект `hypothesisToClone`

---

## Шаг 6: Обновление UI таблицы - добавление колонки приоритета

### 6.1 Добавление заголовка колонки Priority
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `TableHeader` (строки 472-504)
- **Действия**:
  - Добавить новую `TableHead` для Priority **после** колонки Status (после строки 487):
    ```typescript
    <TableHead className={cn(
      !isMobile && "w-[80px]",
      isMobile && "min-w-[80px]"
    )}>
      <button
        onClick={handlePrioritySort}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity text-xs whitespace-nowrap w-full justify-start"
        type="button"
      >
        Priority
        {prioritySort === "asc" && <ArrowUp className="h-3 w-3" />}
        {prioritySort === "desc" && <ArrowDown className="h-3 w-3" />}
      </button>
    </TableHead>
    ```

### 6.2 Добавление ячейки Priority в строки таблицы
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `TableBody` (строки 506-574)
- **Действия**:
  - Добавить новую `TableCell` для Priority **после** ячейки Status (после строки 524):
    ```typescript
    <TableCell className={cn(
      !isMobile && "w-[80px]",
      isMobile && "min-w-[80px]",
      "px-2 overflow-hidden"
    )}>
      <span className="text-xs whitespace-nowrap block truncate">
        {hypothesis.priority ?? 3}
      </span>
    </TableCell>
    ```

---

## Шаг 7: Обновление редактора гипотез - добавление поля Priority

### 7.1 Добавление поля Priority в правую часть редактора
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: `rightContent` в `EntityDialog` (строки 655-709)
- **Действия**:
  - Добавить новое поле **после** поля Status (после строки 676):
    ```typescript
    <div>
      <Label htmlFor="priority">Priority</Label>
      <Input
        id="priority"
        type="number"
        min="1"
        max="10"
        value={editingHypothesis.priority ?? 3}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          if (!isNaN(value)) {
            setEditingHypothesis({ 
              ...editingHypothesis, 
              priority: value 
            });
          }
        }}
        placeholder="3"
      />
    </div>
    ```

---

## Шаг 8: Обновление порядка статусов в меню выбора

### 8.1 Обновление порядка в Select
- **Файл**: `src/pages/HypothesesPage.tsx`
- **Место**: массив `statuses` (строки 90-95)
- **Действия**:
  - Обновить массив `statuses` согласно требованиям ESS-62 (уже должно быть сделано в шаге 3.1):
    ```typescript
    const statuses: { value: Status; label: string }[] = [
      { value: "new", label: "New" },
      { value: "inProgress", label: "In work" },
      { value: "accepted", label: "Accepted" },
      { value: "done", label: "Done" },
      { value: "rejected", label: "Rejected" },
    ];
    ```
  - Порядок в массиве определяет порядок в меню выбора
  - Убедиться, что все 5 статусов присутствуют в правильном порядке

---

## Шаг 9: Тестирование

### 9.1 Тестирование базы данных
- [ ] Применить миграцию
- [ ] Проверить, что все существующие гипотезы получили `priority = 3`
- [ ] Проверить, что новые гипотезы создаются с `priority = 3` по умолчанию

### 9.2 Тестирование UI
- [ ] Проверить отображение колонки Priority в таблице
- [ ] Проверить, что приоритет отображается второй колонкой (после Status)
- [ ] Проверить, что стрелки сортировки отображаются корректно

### 9.3 Тестирование сортировки по приоритету
- [ ] Проверить сортировку по возрастанию приоритета
- [ ] Проверить сортировку по убыванию приоритета
- [ ] Проверить вторичную сортировку по статусу при равных приоритетах
- [ ] Проверить отключение сортировки (третий клик)

### 9.4 Тестирование сортировки по статусу
- [ ] Проверить, что порядок статусов соответствует требованиям (New → In work → Accepted → Done → Rejected)
- [ ] Проверить, что все 5 статусов доступны в меню выбора
- [ ] Проверить сортировку по возрастанию статуса
- [ ] Проверить сортировку по убыванию статуса
- [ ] Проверить вторичную сортировку по приоритету при равных статусах
- [ ] Проверить отключение сортировки
- [ ] Проверить создание гипотезы со статусом "done"
- [ ] Проверить изменение статуса на "done"

### 9.5 Тестирование редактора
- [ ] Проверить, что поле Priority отображается в правой части редактора
- [ ] Проверить создание новой гипотезы с приоритетом
- [ ] Проверить редактирование приоритета существующей гипотезы
- [ ] Проверить, что значение по умолчанию = 3
- [ ] Проверить клонирование гипотезы (приоритет должен копироваться)

### 9.6 Тестирование взаимодействия сортировок
- [ ] Проверить, что можно включить сортировку по приоритету, когда активна сортировка по статусу
- [ ] Проверить, что можно включить сортировку по статусу, когда активна сортировка по приоритету
- [ ] Проверить, что обе сортировки могут быть активны одновременно
- [ ] Проверить корректность вторичной сортировки в обоих случаях

---

## Шаг 10: Обновление документации (опционально)

### 10.1 Обновление data-model.md
- **Файл**: `docs/data-model.md`
- **Действия**: Добавить описание поля `priority` в таблице `hypotheses`

---

## Порядок выполнения шагов

1. **Шаг 1**: Миграция БД - добавление статуса "done" и поля priority (критично - без этого ничего не будет работать)
2. **Шаг 2**: Обновление типов - добавление "done" в тип Status и priority в интерфейсы (необходимо для компиляции)
3. **Шаг 3**: Обновление порядка статусов (ESS-62) - добавление "done" в массив и объект сортировки
4. **Шаг 4**: Логика сортировки по приоритету
5. **Шаг 5**: Обновление запросов к БД
6. **Шаг 6**: UI таблицы (колонка Priority)
7. **Шаг 7**: UI редактора (поле Priority)
8. **Шаг 8**: Порядок статусов в меню (проверка, что "done" присутствует)
9. **Шаг 9**: Тестирование
10. **Шаг 10**: Документация (опционально)

---

## Важные замечания

1. **Статус "Done"**: Новый статус, который нужно добавить в БД. После миграции будет 5 статусов: `new`, `inProgress`, `accepted`, `done`, `rejected`.

2. **Статус "In work"**: В требованиях указан "In work", в БД - "inProgress". Используем "inProgress" с лейблом "In work".

3. **Порядок статусов**: Согласно ESS-62 порядок должен быть: New → In work → Accepted → Done → Rejected (соответствует: new → inProgress → accepted → done → rejected).

4. **Приоритет по умолчанию**: Всегда 3, как указано в требованиях.

5. **Вторичная сортировка**: 
   - При сортировке по приоритету → вторичная по статусу (если статус-сортировка активна)
   - При сортировке по статусу → вторичная по приоритету (всегда)

6. **Одновременная активность сортировок**: Обе сортировки могут быть активны одновременно, приоритет имеет основная сортировка.

7. **Миграция статуса**: При добавлении нового статуса "done" в CHECK constraint, существующие записи не изменяются автоматически. Новый статус будет доступен только для новых или обновленных записей.

---

## Файлы для изменения

1. `supabase/migrations/YYYYMMDDHHMMSS_add_done_status_and_priority_to_hypotheses.sql` (новый)
2. `supabase/migrations/final_full_schema.sql`
3. `src/pages/HypothesesPage.tsx` (основной файл - обновление типа Status, интерфейса, логики сортировки, UI)
4. `src/integrations/supabase/types.ts` (если не генерируется автоматически)
5. `docs/data-model.md` (опционально - добавить описание статуса "done" и поля priority)
