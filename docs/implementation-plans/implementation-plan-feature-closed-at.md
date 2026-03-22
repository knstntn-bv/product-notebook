# План реализации: PRO-68 Фиксация момента выполнения фичи

## Обзор

Добавление поля `closed_at` (дата-время закрытия) к сущности фичи. Поле заполняется автоматически при переносе фичи в колонки "Done" или "Cancelled" и обновляется при повторном переносе в эти колонки.

## Цели

1. Добавить поле `closed_at` в таблицу `features` (необязательное, по умолчанию NULL)
2. Автоматически устанавливать `closed_at = now()` при переносе фичи в колонку "Done" или "Cancelled"
3. Обновлять `closed_at` при повторном переносе в эти колонки
4. Обновить TypeScript типы для поддержки нового поля

## Шаги реализации

### Шаг 1: Миграция базы данных

**Файл**: `supabase/migrations/YYYYMMDDHHMMSS_add_closed_at_to_features.sql`

**Действия**:
1. Добавить колонку `closed_at` в таблицу `features`:
   - Тип: `timestamptz` (timestamp with time zone)
   - Nullable: `true` (необязательное поле)
   - По умолчанию: `NULL`
   - Комментарий для документации

**SQL**:
```sql
-- Add closed_at column to features table
ALTER TABLE public.features
  ADD COLUMN closed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.features.closed_at IS 'Timestamp when the feature was closed (moved to Done or Cancelled column). Updated on each move to these columns.';
```

**Проверка**:
- Убедиться, что миграция применяется без ошибок
- Проверить, что существующие записи имеют `closed_at = NULL`
- Проверить, что поле может быть NULL (необязательное)

**Обновление финальной схемы**:
- **Файл**: `supabase/migrations/final_full_schema.sql`
- **Действия**:
  - Добавить поле `closed_at timestamptz` в определение таблицы `features` (после `updated_at`)

---

### Шаг 2: Обновление TypeScript типов

**Файл**: `src/integrations/supabase/types.ts`

**Действия**:
1. Обновить интерфейс `features` в типах базы данных:
   - Добавить `closed_at: string | null` в `Row`
   - Добавить `closed_at?: string | null` в `Insert`
   - Добавить `closed_at?: string | null` в `Update`

**Изменения**:
```typescript
features: {
  Row: {
    // ... existing fields
    closed_at: string | null
  }
  Insert: {
    // ... existing fields
    closed_at?: string | null
  }
  Update: {
    // ... existing fields
    closed_at?: string | null
  }
  // ... relationships
}
```

**Проверка**:
- Запустить генерацию типов (если используется автоматическая генерация)
- Проверить, что TypeScript компилируется без ошибок

---

### Шаг 3: Обновление интерфейса Feature в компонентах

**Файлы**:
- `src/pages/BoardPage.tsx`
- Другие файлы, где используется интерфейс `Feature` (если есть)

**Действия**:
1. Добавить поле `closed_at?: string | null` в интерфейс `Feature` в `BoardPage.tsx` (строка ~28-37)

**Изменения**:
```typescript
interface Feature {
  id: string;
  title: string;
  description: string;
  goal_id?: string;
  initiative_id?: string;
  hypothesis_id?: string;
  board_column: ColumnId;
  position: number;
  human_readable_id?: string;
  closed_at?: string | null; // NEW
}
```

**Проверка**:
- Убедиться, что TypeScript компилируется без ошибок
- Проверить, что нет ошибок линтера

---

### Шаг 4: Логика обновления closed_at при переносе в Done/Cancelled

**Файл**: `src/pages/BoardPage.tsx`

**Действия**:
1. Обновить функцию `dragFeatureMutation` для установки `closed_at` при переносе в "done" или "cancelled"
2. Обновить функцию `handleDragEnd` для включения `closed_at` в обновления

**Логика**:
- При переносе фичи в колонку "done" или "cancelled": установить `closed_at = now()`
- При переносе из "done"/"cancelled" в другую колонку: оставить `closed_at` без изменений (не сбрасывать)
- При повторном переносе в "done"/"cancelled": обновить `closed_at = now()` (перезаписать)

**Изменения в `dragFeatureMutation`** (строка ~277-296):

```typescript
const dragFeatureMutation = useMutation({
  mutationFn: async ({ updates }: { updates: Array<{ id: string; position: number; board_column?: string }> }) => {
    const promises = updates.map(update => {
      const updateData: any = { 
        position: update.position,
        ...(update.board_column && { board_column: update.board_column })
      };
      
      // Set closed_at when moving to done or cancelled
      if (update.board_column === 'done' || update.board_column === 'cancelled') {
        updateData.closed_at = new Date().toISOString();
      }
      
      return supabase.from("features").update(updateData).eq("id", update.id);
    });
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw errors[0].error;
  },
  // ... rest of mutation
});
```

**Изменения в `handleDragEnd`** (строка ~606-810):

В функции `handleDragEnd` нужно обновить оптимистичные обновления, чтобы включить `closed_at` при переносе в "done" или "cancelled":

```typescript
// В местах, где обновляется board_column на "done" или "cancelled", 
// также обновить closed_at в оптимистичном обновлении:
updatedFeatures = originalFeatures.map(feature => {
  const update = updates.find(u => u.id === feature.id);
  if (update) {
    const updatedFeature = {
      ...feature,
      position: update.position,
      ...(update.board_column && { board_column: update.board_column as ColumnId })
    };
    
    // Set closed_at when moving to done or cancelled
    if (update.board_column === 'done' || update.board_column === 'cancelled') {
      updatedFeature.closed_at = new Date().toISOString();
    }
    
    return updatedFeature;
  }
  return feature;
});
```

**Проверка**:
- Убедиться, что при переносе в "done" или "cancelled" поле `closed_at` устанавливается
- Убедиться, что при повторном переносе в эти колонки `closed_at` обновляется
- Убедиться, что при переносе из "done"/"cancelled" в другую колонку `closed_at` не изменяется

---

### Шаг 5: Обновление saveFeatureMutation (опционально, для консистентности)

**Файл**: `src/pages/BoardPage.tsx`

**Действия**:
1. Обновить `saveFeatureMutation` для установки `closed_at` при сохранении фичи с `board_column = 'done'` или `'cancelled'`

**Логика**:
- При сохранении/создании фичи с колонкой "done" или "cancelled": установить `closed_at = now()`
- При изменении колонки на "done" или "cancelled": установить `closed_at = now()`
- При изменении колонки с "done"/"cancelled" на другую: оставить `closed_at` без изменений

**Изменения** (строка ~180-252):

```typescript
const saveFeatureMutation = useMutation({
  mutationFn: async (feature: Partial<Feature>) => {
    // ... existing code ...
    
    const updateData: any = {
      title: feature.title!,
      description: feature.description || null,
      goal_id: feature.goal_id || null,
      initiative_id: feature.initiative_id || null,
      hypothesis_id: feature.hypothesis_id || null,
      board_column: feature.board_column!,
    };
    
    // Set closed_at when board_column is done or cancelled
    if (feature.board_column === 'done' || feature.board_column === 'cancelled') {
      updateData.closed_at = new Date().toISOString();
    }
    
    // ... rest of mutation logic ...
  },
  // ... rest of mutation
});
```

**Проверка**:
- Убедиться, что при создании фичи в колонке "done" или "cancelled" `closed_at` устанавливается
- Убедиться, что при изменении колонки на "done" или "cancelled" `closed_at` устанавливается

---

## Тестирование

### Тест 1: Перенос фичи в Done
1. Создать фичу в любой колонке (кроме "done" и "cancelled")
2. Перетащить фичу в колонку "Done"
3. Проверить, что в базе данных `closed_at` установлен на текущее время

### Тест 2: Перенос фичи в Cancelled
1. Создать фичу в любой колонке
2. Перетащить фичу в колонку "Cancelled"
3. Проверить, что в базе данных `closed_at` установлен на текущее время

### Тест 3: Повторный перенос в Done/Cancelled
1. Взять фичу, которая уже в "Done" (с установленным `closed_at`)
2. Перетащить в другую колонку (например, "development")
3. Проверить, что `closed_at` не изменился
4. Перетащить обратно в "Done"
5. Проверить, что `closed_at` обновлен на новое время

### Тест 4: Создание фичи в Done/Cancelled
1. Создать новую фичу, сразу указав колонку "Done"
2. Проверить, что `closed_at` установлен при создании

### Тест 5: Изменение колонки через редактор
1. Открыть фичу в редакторе
2. Изменить колонку на "Done" или "Cancelled"
3. Сохранить
4. Проверить, что `closed_at` установлен

---

## Дополнительные замечания

1. **Временная зона**: Используется `timestamptz` для корректной работы с временными зонами
2. **Формат времени**: В TypeScript используется ISO строка (`new Date().toISOString()`), что соответствует формату Supabase
3. **Оптимистичные обновления**: `closed_at` также обновляется в оптимистичных обновлениях для лучшего UX
4. **Обратная совместимость**: Существующие фичи будут иметь `closed_at = NULL`, что соответствует требованиям

---

## Чеклист выполнения

- [x] Создать миграцию базы данных
- [x] Обновить `final_full_schema.sql`
- [x] Обновить TypeScript типы в `types.ts`
- [x] Обновить интерфейс `Feature` в `BoardPage.tsx`
- [x] Обновить `dragFeatureMutation` для установки `closed_at`
- [x] Обновить `handleDragEnd` для оптимистичных обновлений `closed_at`
- [x] Обновить `saveFeatureMutation` для установки `closed_at`
- [x] Протестировать все сценарии
- [x] Проверить, что нет ошибок TypeScript и линтера

## Статус: ✅ РЕАЛИЗОВАНО

Все шаги выполнены. Функциональность работает корректно:
- Поле `closed_at` добавляется в базу данных при переносе фичи в колонки "Done" или "Cancelled"
- Поле обновляется при повторном переносе в эти колонки
- Поле устанавливается при создании/редактировании фичи через редактор
- Оптимистичные обновления работают корректно
