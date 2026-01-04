# ТЗ: Клонирование гипотез (NNN-59)

## Описание проблемы

Текущая структура гипотез неудобна для работы: на один инсайт может быть много проблем и много решений. Необходимо добавить возможность дублировать гипотезы на базе одного инсайта, чтобы под уже сформулированные проблемы можно было создать множество отдельных записей.

## Цель

Реализовать функционал клонирования гипотез, позволяющий создавать копии существующих гипотез с теми же данными для дальнейшей независимой работы с ними.

## Требования

### 1. UI/UX требования

#### 1.1. Размещение кнопки клонирования
- В интерфейсе редактирования гипотезы (EntityDialog) в правой панели (rightContent) добавить кнопку "Clone"
- Кнопка должна быть размещена рядом с кнопкой "Create Feature" (после неё или перед ней)
- Кнопка должна быть видна только при редактировании существующей гипотезы (isEditing === true)
- Стиль кнопки: `variant="outline"`, `className="w-full"`
- Иконка: использовать иконку `Copy` из `lucide-react`

#### 1.2. Поведение при клонировании
- При нажатии на кнопку "Clone":
  - Создаётся новая гипотеза с идентичным содержанием всех полей текущей гипотезы
  - Исходная гипотеза остаётся открытой в редакторе (диалог не закрывается)
  - После успешного создания показывается toast-уведомление: "Hypothesis cloned successfully"
  - Список гипотез автоматически обновляется (через invalidation query)

### 2. Технические требования

#### 2.1. Поля для копирования
При клонировании должны быть скопированы следующие поля из исходной гипотезы:
- `status` - статус гипотезы
- `insight` - инсайт
- `problem_hypothesis` - гипотеза проблемы
- `problem_validation` - валидация проблемы
- `solution_hypothesis` - гипотеза решения
- `solution_validation` - валидация решения
- `impact_metrics` - метрики влияния (массив строк)
- `product_id` - ID продукта (из текущего контекста)

**Поля, которые НЕ копируются:**
- `id` - генерируется новый UUID
- `created_at` - устанавливается текущая дата/время
- `updated_at` - устанавливается текущая дата/время

#### 2.2. Реализация мутации клонирования

Создать новую мутацию `cloneHypothesisMutation` в компоненте `HypothesesPage.tsx`:

```typescript
const cloneHypothesisMutation = useMutation({
  mutationFn: async (hypothesis: Hypothesis) => {
    if (!currentProductId) throw new Error("No product selected");
    
    const { error } = await supabase
      .from("hypotheses")
      .insert({
        product_id: currentProductId,
        status: hypothesis.status,
        insight: hypothesis.insight || "",
        problem_hypothesis: hypothesis.problem_hypothesis || "",
        problem_validation: hypothesis.problem_validation || "",
        solution_hypothesis: hypothesis.solution_hypothesis || "",
        solution_validation: hypothesis.solution_validation || "",
        impact_metrics: hypothesis.impact_metrics || [],
      });
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
    toast({ title: "Hypothesis cloned successfully" });
  },
  onError: (error: any) => {
    toast({ 
      title: "Error", 
      description: error.message, 
      variant: "destructive" 
    });
  },
});
```

#### 2.3. Обработчик клонирования

Создать функцию `handleCloneHypothesis`:

```typescript
const handleCloneHypothesis = () => {
  if (editingHypothesis?.id) {
    const hypothesis = hypotheses.find(h => h.id === editingHypothesis.id);
    if (hypothesis) {
      cloneHypothesisMutation.mutate(hypothesis);
    }
  }
};
```

#### 2.4. Добавление кнопки в UI

В компоненте `EntityDialog` в `rightContent`, после кнопки "Create Feature", добавить:

```tsx
<Button
  variant="outline"
  onClick={handleCloneHypothesis}
  className="w-full"
  disabled={cloneHypothesisMutation.isPending}
>
  <Copy className="h-4 w-4 mr-2" />
  Clone
</Button>
```

### 3. Импорты

Добавить в начало файла `HypothesesPage.tsx`:
```typescript
import { Copy } from "lucide-react";
```

### 4. Обработка состояний

- Кнопка должна быть disabled во время выполнения мутации (`cloneHypothesisMutation.isPending`)
- При ошибке показывать toast с описанием ошибки
- При успехе автоматически обновлять список гипотез

## Тестирование

### Сценарии для проверки:

1. **Успешное клонирование:**
   - Открыть существующую гипотезу
   - Нажать кнопку "Clone"
   - Проверить, что:
     - Диалог остался открытым
     - Исходная гипотеза не изменилась
     - В таблице появилась новая гипотеза с теми же данными
     - Показано уведомление об успехе

2. **Клонирование с пустыми полями:**
   - Открыть гипотезу с частично заполненными полями
   - Клонировать её
   - Проверить, что пустые поля корректно скопированы (остались пустыми)

3. **Клонирование с метриками:**
   - Открыть гипотезу с заполненными метриками влияния
   - Клонировать её
   - Проверить, что все метрики скопированы

4. **Кнопка не видна при создании новой гипотезы:**
   - Нажать "Add Hypothesis"
   - Проверить, что кнопка "Clone" отсутствует в правой панели

5. **Обработка ошибок:**
   - Симулировать ошибку при создании (например, отключить интернет)
   - Проверить, что показывается сообщение об ошибке

## Файлы для изменения

1. `src/pages/HypothesesPage.tsx` - основной файл с логикой гипотез

## Зависимости

- Используется существующая инфраструктура:
  - `@tanstack/react-query` для мутаций и кэширования
  - `supabase` для работы с БД
  - `useToast` для уведомлений
  - `EntityDialog` для отображения диалога

## Примечания

- Клонированная гипотеза получает новый UUID и новые временные метки
- Исходная гипотеза не изменяется при клонировании
- После клонирования пользователь может продолжить редактирование исходной гипотезы или закрыть диалог и открыть клонированную
- Клонирование происходит синхронно с обновлением UI через React Query

