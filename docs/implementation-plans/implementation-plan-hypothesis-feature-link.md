# План реализации: NNN-65 Привязка фичи к гипотезе - в обе стороны

## Обзор

Реализация двусторонней привязки между фичами и гипотезами (отношение много-к-одному: одна гипотеза может быть связана с несколькими фичами).

## Цели

1. Добавить поле `hypothesis_id` в таблицу `features`
2. Автоматически заполнять `hypothesis_id` при создании фичи из гипотезы
3. Добавить возможность создать гипотезу из фичи через кнопку "Discovery this feature"
4. Добавить UI для ручного выбора/изменения гипотезы в редакторе фичи
5. При создании гипотезы из фичи автоматически заполнять `hypothesis_id` в фиче и переносить фичу в колонку "Discovery"

## Шаги реализации

### Шаг 1: Миграция базы данных

**Файл**: `supabase/migrations/YYYYMMDDHHMMSS_add_hypothesis_id_to_features.sql`

**Действия**:
1. Добавить колонку `hypothesis_id` в таблицу `features`:
   - Тип: `uuid`
   - Nullable: `true` (необязательное поле)
   - Foreign key: `REFERENCES public.hypotheses(id) ON DELETE SET NULL`
   - Индекс: создать индекс для оптимизации запросов

**SQL**:
```sql
-- Add hypothesis_id column to features table
ALTER TABLE public.features
  ADD COLUMN hypothesis_id uuid REFERENCES public.hypotheses(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_features_hypothesis_id ON public.features(hypothesis_id);

-- Add comment for documentation
COMMENT ON COLUMN public.features.hypothesis_id IS 'Optional reference to the hypothesis this feature is linked to (many-to-one relationship)';
```

**Проверка**:
- Убедиться, что миграция применяется без ошибок
- Проверить, что существующие записи имеют `hypothesis_id = NULL`

---

### Шаг 2: Обновление TypeScript типов

**Файл**: `src/integrations/supabase/types.ts`

**Действия**:
1. Обновить интерфейс `features` в типах базы данных:
   - Добавить `hypothesis_id: string | null` в `Row`
   - Добавить `hypothesis_id?: string | null` в `Insert`
   - Добавить `hypothesis_id?: string | null` в `Update`
   - Добавить relationship в массив `Relationships`

**Изменения**:
```typescript
features: {
  Row: {
    // ... existing fields
    hypothesis_id: string | null
  }
  Insert: {
    // ... existing fields
    hypothesis_id?: string | null
  }
  Update: {
    // ... existing fields
    hypothesis_id?: string | null
  }
  Relationships: [
    // ... existing relationships
    {
      foreignKeyName: "features_hypothesis_id_fkey"
      columns: ["hypothesis_id"]
      isOneToOne: false
      referencedRelation: "hypotheses"
      referencedColumns: ["id"]
    }
  ]
}
```

**Проверка**:
- Запустить генерацию типов (если используется автоматическая генерация)
- Проверить, что TypeScript компилируется без ошибок

---

### Шаг 3: Обновление интерфейсов Feature в компонентах

**Файлы**:
- `src/pages/BoardPage.tsx`
- `src/pages/HypothesesPage.tsx`

**Действия**:
1. Добавить поле `hypothesis_id?: string` в интерфейс `Feature` в обоих файлах

**Изменения**:
```typescript
interface Feature {
  id: string;
  title: string;
  description?: string;
  board_column: ColumnId;
  goal_id?: string;
  initiative_id?: string;
  hypothesis_id?: string; // NEW
  position: number;
  human_readable_id?: string;
}
```

**Проверка**:
- Убедиться, что TypeScript не выдает ошибок
- Проверить, что все места использования `Feature` корректны

---

### Шаг 4: Обновление логики создания фичи из гипотезы

**Файл**: `src/pages/HypothesesPage.tsx`

**Действия**:
1. Обновить функцию `handleCreateFeature`:
   - Добавить `hypothesis_id: hypothesis.id` в объект `creatingFeature`

**Изменения**:
```typescript
const handleCreateFeature = (hypothesis: Hypothesis) => {
  setCreatingFeature({
    title: (hypothesis.insight || "").toString(),
    description: (hypothesis.solution_hypothesis || "").toString(),
    board_column: "backlog",
    hypothesis_id: hypothesis.id, // NEW: автоматически привязываем гипотезу
  });
  setIsFeatureDialogOpen(true);
};
```

2. Обновить мутацию `createFeatureMutation`:
   - Убедиться, что `hypothesis_id` передается в insert запрос

**Проверка**:
- Создать фичу из гипотезы
- Проверить, что в базе данных `hypothesis_id` заполнен корректно

---

### Шаг 5: Добавление UI для выбора гипотезы в редакторе фичи (BoardPage)

**Файл**: `src/pages/BoardPage.tsx`

**Действия**:
1. Добавить состояние для popover выбора гипотезы:
   ```typescript
   const [hypothesisOpen, setHypothesisOpen] = useState(false);
   ```

2. Добавить запрос для получения списка гипотез:
   ```typescript
   const { data: hypotheses = [] } = useQuery({
     queryKey: ["hypotheses", currentProductId],
     queryFn: async () => {
       if (!currentProductId) return [];
       const { data, error } = await supabase
         .from("hypotheses")
         .select("*")
         .eq("product_id", currentProductId)
         .order("created_at", { ascending: true });
       if (error) throw error;
       return data || [];
     },
     enabled: !!currentProductId,
   });
   ```

3. Добавить функцию для выбора гипотезы:
   ```typescript
   const handleHypothesisSelect = (hypothesisId: string | null) => {
     setEditingFeature({
       ...editingFeature,
       hypothesis_id: hypothesisId || undefined,
     });
     setHypothesisOpen(false);
   };
   ```

4. Добавить функцию для получения названия гипотезы:
   ```typescript
   const getHypothesisName = (hypothesisId?: string) => {
     if (!hypothesisId) return "";
     const hypothesis = hypotheses.find(h => h.id === hypothesisId);
     return hypothesis?.insight || "";
   };
   ```

5. Добавить UI элемент в редактор фичи (в `leftContent` диалога):
   - Popover с Command для выбора гипотезы
   - Аналогично существующему выбору Goal/Initiative
   - Опция "None" для сброса привязки

**UI структура**:
```tsx
<div className="space-y-2">
  <Label>Hypothesis</Label>
  <Popover open={hypothesisOpen} onOpenChange={setHypothesisOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        className="w-full justify-between"
      >
        {editingFeature?.hypothesis_id
          ? getHypothesisName(editingFeature.hypothesis_id)
          : "Select hypothesis..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-full p-0">
      <Command>
        <CommandInput placeholder="Search hypothesis..." />
        <CommandList>
          <CommandEmpty>No hypothesis found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="none"
              onSelect={() => handleHypothesisSelect(null)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !editingFeature?.hypothesis_id ? "opacity-100" : "opacity-0"
                )}
              />
              None
            </CommandItem>
            {hypotheses.map((hypothesis) => (
              <CommandItem
                key={hypothesis.id}
                value={hypothesis.id}
                onSelect={() => handleHypothesisSelect(hypothesis.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    editingFeature?.hypothesis_id === hypothesis.id
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {hypothesis.insight || "Untitled hypothesis"}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
```

6. Обновить мутацию `saveFeatureMutation`:
   - Убедиться, что `hypothesis_id` сохраняется в базе данных

**Проверка**:
- Открыть редактор фичи
- Проверить, что поле "Hypothesis" отображается
- Выбрать гипотезу и сохранить
- Проверить, что привязка сохраняется в базе данных
- Проверить возможность сброса привязки (выбор "None")

---

### Шаг 6: Добавление кнопки "Discovery this feature" в редакторе фичи

**Файл**: `src/pages/BoardPage.tsx`

**Действия**:
1. Добавить состояние для диалога создания гипотезы из фичи:
   ```typescript
   const [creatingHypothesisFromFeature, setCreatingHypothesisFromFeature] = useState<{
     featureId: string;
     title: string;
     description: string;
   } | null>(null);
   const [isHypothesisDialogOpen, setIsHypothesisDialogOpen] = useState(false);
   ```

2. Добавить функцию для инициации создания гипотезы:
   ```typescript
   const handleDiscoveryThisFeature = () => {
     if (!editingFeature) return;
     
     // Сохраняем текущую фичу, если она еще не сохранена
     if (!editingFeature.id) {
       // Сначала сохраняем фичу, затем создаем гипотезу
       saveFeatureMutation.mutate(editingFeature, {
         onSuccess: () => {
           // После сохранения получим ID из запроса
           // Нужно будет получить сохраненную фичу из кэша
           queryClient.invalidateQueries({ queryKey: ["features", currentProductId] });
         }
       });
       return;
     }
     
     setCreatingHypothesisFromFeature({
       featureId: editingFeature.id,
       title: editingFeature.title,
       description: editingFeature.description || "",
     });
     setIsHypothesisDialogOpen(true);
   };
   ```

3. Добавить состояние для редактирования гипотезы:
   ```typescript
   const [editingHypothesis, setEditingHypothesis] = useState<Partial<{
     id: string;
     status: Status;
     insight: string;
     problem_hypothesis: string;
     problem_validation: string;
     solution_hypothesis: string;
     solution_validation: string;
     impact_metrics: string[];
   }> | null>(null);
   ```

4. При открытии диалога гипотезы предзаполнить поля:
   ```typescript
   useEffect(() => {
     if (creatingHypothesisFromFeature && isHypothesisDialogOpen) {
       setEditingHypothesis({
         status: "new",
         insight: creatingHypothesisFromFeature.title,
         problem_hypothesis: creatingHypothesisFromFeature.description,
         problem_validation: "",
         solution_hypothesis: "",
         solution_validation: "",
         impact_metrics: [],
       });
     }
   }, [creatingHypothesisFromFeature, isHypothesisDialogOpen]);
   ```

5. Добавить мутацию для сохранения гипотезы с обновлением фичи:
   ```typescript
   const saveHypothesisFromFeatureMutation = useMutation({
     mutationFn: async (hypothesis: NonNullable<typeof editingHypothesis>) => {
       if (!currentProductId) throw new Error("No product selected");
       if (!creatingHypothesisFromFeature) throw new Error("No feature context");
       
       // Создаем гипотезу
       const { data: newHypothesis, error: hypothesisError } = await supabase
         .from("hypotheses")
         .insert({
           product_id: currentProductId,
           status: hypothesis.status || "new",
           insight: hypothesis.insight || "",
           problem_hypothesis: hypothesis.problem_hypothesis || "",
           problem_validation: hypothesis.problem_validation || "",
           solution_hypothesis: hypothesis.solution_hypothesis || "",
           solution_validation: hypothesis.solution_validation || "",
           impact_metrics: hypothesis.impact_metrics || [],
         })
         .select()
         .single();
       
       if (hypothesisError) throw hypothesisError;
       
       // Обновляем фичу: привязываем гипотезу и переносим в Discovery
       const { error: featureError } = await supabase
         .from("features")
         .update({
           hypothesis_id: newHypothesis.id,
           board_column: "discovery",
         })
         .eq("id", creatingHypothesisFromFeature.featureId);
       
       if (featureError) throw featureError;
       
       return newHypothesis;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["hypotheses", currentProductId] });
       queryClient.invalidateQueries({ queryKey: ["features", currentProductId] });
       setCreatingHypothesisFromFeature(null);
       setEditingHypothesis(null);
       setIsHypothesisDialogOpen(false);
       setIsDialogOpen(false); // Закрываем диалог фичи
       toast({ title: "Hypothesis created and feature linked successfully" });
     },
     onError: (error: any) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
   ```

6. Добавить кнопку "Discovery this feature" в `rightContent` диалога фичи:
   ```tsx
   <Button
     variant="outline"
     onClick={handleDiscoveryThisFeature}
     className="w-full"
   >
     Discovery this feature
   </Button>
   ```

7. Добавить диалог для редактирования гипотезы (использовать `EntityDialog`):
   - Использовать тот же компонент, что и в `HypothesesPage`
   - Или создать переиспользуемый компонент

**Проверка**:
- Открыть редактор фичи
- Нажать "Discovery this feature"
- Проверить, что открывается диалог гипотезы с предзаполненными полями
- Сохранить гипотезу
- Проверить, что фича привязана к гипотезе
- Проверить, что фича перенесена в колонку "Discovery"

---

### Шаг 7: Обновление логики сохранения фичи (включение hypothesis_id)

**Файл**: `src/pages/BoardPage.tsx`

**Действия**:
1. Обновить мутацию `saveFeatureMutation`:
   - Убедиться, что `hypothesis_id` включен в update/insert запрос

**Проверка**:
- Сохранить фичу с выбранной гипотезой
- Проверить в базе данных, что `hypothesis_id` сохранен

---

### Шаг 8: Обновление отображения фичи (опционально)

**Файл**: `src/pages/BoardPage.tsx`

**Действия**:
1. Опционально: добавить визуальный индикатор привязки к гипотезе на карточке фичи
   - Например, иконка или badge
   - Или отображать в tooltip при наведении

**Проверка**:
- Проверить визуальное отображение привязки (если реализовано)

---

### Шаг 9: Обновление логики создания фичи в HypothesesPage

**Файл**: `src/pages/HypothesesPage.tsx`

**Действия**:
1. Убедиться, что в `createFeatureMutation` передается `hypothesis_id`:
   ```typescript
   const { error } = await supabase
     .from("features")
     .insert({
       product_id: currentProductId,
       title: feature.title,
       description: feature.description || "",
       goal_id: feature.goal_id,
       initiative_id: feature.initiative_id,
       hypothesis_id: feature.hypothesis_id, // NEW
       board_column: feature.board_column,
       position: maxPosition + 1,
       human_readable_id: human_readable_id,
     });
   ```

**Проверка**:
- Создать фичу из гипотезы
- Проверить, что `hypothesis_id` сохранен корректно

---

### Шаг 10: Тестирование

**Сценарии для тестирования**:

1. **Создание фичи из гипотезы**:
   - Открыть гипотезу
   - Нажать "Create Feature"
   - Проверить, что фича создана с `hypothesis_id`
   - Проверить в базе данных

2. **Ручное связывание фичи с гипотезой**:
   - Открыть редактор фичи
   - Выбрать гипотезу из списка
   - Сохранить
   - Проверить в базе данных

3. **Создание гипотезы из фичи**:
   - Открыть редактор фичи
   - Нажать "Discovery this feature"
   - Заполнить и сохранить гипотезу
   - Проверить, что фича привязана к гипотезе
   - Проверить, что фича перенесена в "Discovery"

4. **Сброс привязки**:
   - Открыть фичу с привязанной гипотезой
   - Выбрать "None" в поле Hypothesis
   - Сохранить
   - Проверить, что `hypothesis_id = NULL` в базе данных

5. **Перезапись привязки**:
   - Открыть фичу с привязанной гипотезой A
   - Нажать "Discovery this feature"
   - Создать новую гипотезу B
   - Проверить, что фича привязана к гипотезе B (не A)

6. **Клонирование гипотезы** (ограничение):
   - Создать фичу из гипотезы A
   - Клонировать гипотезу A (создать гипотезу B)
   - Проверить, что фича все еще привязана к гипотезе A (не B)

---

### Шаг 11: Обновление документации

**Файлы**:
- `docs/data-model.md` - добавить описание связи features-hypotheses
- `docs/board-page.md` - описать новую функциональность
- `docs/hypotheses-page.md` - обновить описание создания фичи из гипотезы

**Содержание**:
- Описание поля `hypothesis_id` в таблице `features`
- Описание отношения много-к-одному
- Описание автоматического заполнения при создании фичи из гипотезы
- Описание функции "Discovery this feature"
- Описание ограничений (клонирование, перезапись)

---

## Порядок выполнения

Рекомендуемый порядок выполнения шагов:

1. **Шаг 1** - Миграция базы данных (основа для всего)
2. **Шаг 2** - Обновление TypeScript типов (необходимо для компиляции)
3. **Шаг 3** - Обновление интерфейсов (необходимо для типизации)
4. **Шаг 4** - Обновление логики создания фичи из гипотезы (существующая функциональность)
5. **Шаг 9** - Обновление мутации создания фичи (необходимо для шага 4)
6. **Шаг 5** - Добавление UI для выбора гипотезы (ручное управление)
7. **Шаг 7** - Обновление логики сохранения фичи (необходимо для шага 5)
8. **Шаг 6** - Добавление кнопки "Discovery this feature" (новая функциональность)
9. **Шаг 8** - Обновление отображения (опционально, можно пропустить)
10. **Шаг 10** - Тестирование
11. **Шаг 11** - Обновление документации

---

## Примечания

- Все изменения должны быть обратно совместимыми (существующие фичи без `hypothesis_id` должны работать)
- При удалении гипотезы `hypothesis_id` в фичах должен стать `NULL` (благодаря `ON DELETE SET NULL`)
- UI для выбора гипотезы должен быть аналогичен существующему UI для выбора Goal/Initiative для консистентности
- Кнопка "Discovery this feature" должна быть доступна только для сохраненных фич (с `id`), либо нужно сначала сохранить фичу

---

## Риски и ограничения

1. **Клонирование гипотезы**: Если гипотеза клонируется, фичи останутся привязанными к исходной гипотезе (это ожидаемое поведение согласно требованиям)

2. **Перезапись привязки**: Если создается новая гипотеза из фичи, старая привязка перезаписывается (это ожидаемое поведение согласно требованиям)

3. **Создание гипотезы из несохраненной фичи**: Нужно сначала сохранить фичу, затем создать гипотезу. Можно реализовать автоматическое сохранение перед созданием гипотезы.

4. **Производительность**: При большом количестве гипотез может потребоваться пагинация в списке выбора (на начальном этапе можно не реализовывать)

---

## Критерии готовности

- [ ] Миграция применена успешно
- [ ] TypeScript типы обновлены и компилируются без ошибок
- [ ] Фича создается из гипотезы с автоматической привязкой
- [ ] Можно вручную выбрать/изменить гипотезу в редакторе фичи
- [ ] Кнопка "Discovery this feature" работает корректно
- [ ] При создании гипотезы из фичи фича привязывается и переносится в Discovery
- [ ] Все тестовые сценарии пройдены
- [ ] Документация обновлена
