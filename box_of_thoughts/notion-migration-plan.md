# План миграции структуры Product Notebook в Notion

## Обзор

Этот документ описывает пошаговый план создания аналогичной структуры данных в Notion с учетом всех ограничений платформы.

**Принятые компромиссы:**
- Human Readable ID будет упрощен (без автоматической генерации префиксов)
- Drag & Drop между ячейками Roadmap недоступен
- Автоматические триггеры заменены на ручные действия или автоматизации (платные)
- Product-based изоляция через фильтры, а не RLS

---

## Этап 1: Создание базовых баз данных

### 1.1. База данных "Products" (Продукты)

**Тип:** Full-page database или inline database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Name | Title | Название продукта (по умолчанию "My Product") |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию): Все продукты
- **Sort:** Created (Ascending)

**Примечания:**
- Это основная база для изоляции данных
- Каждый продукт будет использоваться как фильтр в других базах

---

### 1.2. База данных "Initiatives" (Инициативы)

**Тип:** Full-page database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Name | Title | Название инициативы |
| Product | Relation → Products | Связь с продуктом (Many-to-One) |
| Description | Text | Описание инициативы |
| Priority | Number | Приоритет (меньше = выше приоритет, по умолчанию 3) |
| Target Metric | Relation → Metrics | Связь с целевой метрикой (Many-to-One, опционально) |
| Color | Select | Цвет для визуальной идентификации (опции: Purple, Blue, Green, Yellow, Red, Orange, Pink, Gray) |
| Archived | Checkbox | Статус архивации (по умолчанию false) |
| Archived At | Date | Дата архивации (опционально) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию):
  - Sort: Priority (Ascending), затем Archived (Ascending)
  - Filter: Product = [текущий продукт]
- **Active Initiatives:**
  - Filter: Product = [текущий продукт] AND Archived = false
  - Sort: Priority (Ascending)

**Примечания:**
- Color в Notion можно реализовать через Select с цветными опциями или через теги
- Для точного соответствия цветам можно использовать Formula, но это сложнее

---

### 1.3. База данных "Metrics" (Метрики)

**Тип:** Full-page database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Name | Title | Название метрики |
| Product | Relation → Products | Связь с продуктом (Many-to-One) |
| Parent Metric | Relation → Metrics | Связь с родительской метрикой (Many-to-One, опционально) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию):
  - Filter: Product = [текущий продукт]
  - Sort: Name (Ascending)
- **Hierarchy View:**
  - Group by: Parent Metric
  - Filter: Product = [текущий продукт]

**Примечания:**
- Иерархия отображается через группировку по Parent Metric
- Для визуализации дерева можно использовать Formula или Rollup

---

### 1.4. База данных "Values" (Ценности)

**Тип:** Full-page database или inline database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Value | Title | Текст ценности |
| Product | Relation → Products | Связь с продуктом (Many-to-One) |
| Position | Number | Позиция в списке (для сортировки) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию):
  - Filter: Product = [текущий продукт]
  - Sort: Position (Ascending)

**Примечания:**
- Можно использовать простой список, но база данных дает больше контроля

---

### 1.5. База данных "Product Formulas" (Формулы продуктов)

**Тип:** Full-page database или inline database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Product | Relation → Products | Связь с продуктом (One-to-One, уникально) |
| Formula | Text | Текст формулы продукта |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию):
  - Filter: Product = [текущий продукт]

**Примечания:**
- Один продукт = одна формула (уникальность через фильтры)
- Можно использовать обычную страницу вместо базы данных

---

### 1.6. База данных "Goals" (Цели)

**Тип:** Full-page database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Goal | Title | Текст цели |
| Product | Relation → Products | Связь с продуктом (Many-to-One) |
| Initiative | Relation → Initiatives | Связь с инициативой (Many-to-One, обязательное) |
| Quarter | Select | Квартал (Current, Next, Half-Year) |
| Expected Result | Text | Ожидаемый результат |
| Achieved Result | Text | Достигнутый результат |
| Target Metrics | Multi-select | Метрики (массив названий, не Relation) |
| Done | Checkbox | Статус выполнения (по умолчанию false) |
| Archived | Checkbox | Статус архивации (по умолчанию false) |
| Archived At | Date | Дата архивации (опционально) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Roadmap View** (основное):
  - Group by: Initiative (затем Quarter)
  - Filter: Product = [текущий продукт] AND Archived = false
  - Sort: Quarter (Ascending)
- **Table View:**
  - Filter: Product = [текущий продукт]
  - Sort: Initiative (Ascending), затем Quarter (Ascending)
- **Active Goals:**
  - Filter: Product = [текущий продукт] AND Archived = false
- **All Goals (with archived):**
  - Filter: Product = [текущий продукт]
  - Sort: Archived (Ascending), затем Initiative (Ascending)

**Примечания:**
- Target Metrics как Multi-select (не Relation) для простоты
- Roadmap через группировку по Initiative и Quarter
- Drag & Drop между ячейками недоступен, нужно редактировать вручную

---

### 1.7. База данных "Hypotheses" (Гипотезы)

**Тип:** Full-page database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Insight | Title | Инсайт/наблюдение |
| Product | Relation → Products | Связь с продуктом (Many-to-One) |
| Status | Select | Статус (New, In Progress, Accepted, Done, Rejected) |
| Priority | Number | Приоритет (меньше = выше приоритет, по умолчанию 3) |
| Problem Hypothesis | Text | Гипотеза о проблеме |
| Problem Validation | Text | Валидация проблемы |
| Solution Hypothesis | Text | Гипотеза о решении |
| Solution Validation | Text | Валидация решения |
| Impact Metrics | Multi-select | Метрики влияния (массив названий) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию):
  - Filter: Product = [текущий продукт]
  - Sort: Priority (Ascending), затем Status (Ascending)
- **By Status:**
  - Group by: Status
  - Filter: Product = [текущий продукт]
  - Sort: Priority (Ascending)
- **By Priority:**
  - Sort: Priority (Ascending), затем Status (Ascending)
  - Filter: Product = [текущий продукт]

**Примечания:**
- Impact Metrics как Multi-select (не Relation) для соответствия оригиналу
- Сложная сортировка (Priority + Status) через множественную сортировку

---

### 1.8. База данных "Features" (Фичи)

**Тип:** Full-page database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Title | Title | Название фичи |
| Product | Relation → Products | Связь с продуктом (Many-to-One) |
| Description | Text | Описание фичи |
| Board Column | Select | Колонка доски (Inbox, Discovery, Backlog, Design, Development, On Hold, Done, Cancelled) |
| Human Readable ID | Formula | Формула для ID (упрощенная версия) |
| Goal | Relation → Goals | Связь с целью (Many-to-One, опционально) |
| Initiative | Relation → Initiatives | Связь с инициативой (Many-to-One, опционально) |
| Hypothesis | Relation → Hypotheses | Связь с гипотезой (Many-to-One, опционально) |
| Closed At | Date | Дата закрытия (опционально) |
| Position | Number | Позиция в колонке (для сортировки) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Formula для Human Readable ID:**
```
if(prop("Initiative") != empty(), 
   slice(upper(prop("Initiative")), 0, 3) + "-" + format(prop("Position")), 
   "NNN-" + format(prop("Position")))
```

**Представления:**
- **Kanban View** (основное):
  - Group by: Board Column
  - Filter: Product = [текущий продукт]
  - Sort: Position (Ascending)
- **Table View:**
  - Filter: Product = [текущий продукт]
  - Sort: Board Column (Ascending), затем Position (Ascending)
- **By Initiative:**
  - Group by: Initiative
  - Filter: Product = [текущий продукт]
- **By Hypothesis:**
  - Group by: Hypothesis
  - Filter: Product = [текущий продукт]

**Примечания:**
- Human Readable ID через Formula (упрощенная версия без автоматической нумерации)
- Position нужно обновлять вручную при перемещении
- Kanban поддерживается, но без точного контроля позиций

---

### 1.9. База данных "Project Settings" (Настройки проекта)

**Тип:** Full-page database или inline database

**Свойства:**
| Название | Тип | Описание |
|----------|-----|----------|
| Product | Relation → Products | Связь с продуктом (One-to-One, уникально) |
| Show Archived | Checkbox | Показывать архивированные элементы (по умолчанию false) |
| Created | Created time | Автоматически |
| Updated | Last edited time | Автоматически |

**Представления:**
- **Table View** (по умолчанию):
  - Filter: Product = [текущий продукт]

**Примечания:**
- Можно использовать обычную страницу с чекбоксом вместо базы данных

---

## Этап 2: Настройка связей (Relations)

### 2.1. Двусторонние связи

После создания всех баз данных, настроить двусторонние связи:

1. **Products ↔ Initiatives**
   - Products: "Initiatives" (Relation → Initiatives, Many)
   - Initiatives: "Product" (Relation → Products, Single)

2. **Products ↔ Metrics**
   - Products: "Metrics" (Relation → Metrics, Many)
   - Metrics: "Product" (Relation → Products, Single)

3. **Products ↔ Values**
   - Products: "Values" (Relation → Values, Many)
   - Values: "Product" (Relation → Products, Single)

4. **Products ↔ Goals**
   - Products: "Goals" (Relation → Goals, Many)
   - Goals: "Product" (Relation → Products, Single)

5. **Products ↔ Hypotheses**
   - Products: "Hypotheses" (Relation → Hypotheses, Many)
   - Hypotheses: "Product" (Relation → Products, Single)

6. **Products ↔ Features**
   - Products: "Features" (Relation → Features, Many)
   - Features: "Product" (Relation → Products, Single)

7. **Initiatives ↔ Goals**
   - Initiatives: "Goals" (Relation → Goals, Many)
   - Goals: "Initiative" (Relation → Initiatives, Single, обязательное)

8. **Initiatives ↔ Features**
   - Initiatives: "Features" (Relation → Features, Many)
   - Features: "Initiative" (Relation → Initiatives, Single, опционально)

9. **Initiatives ↔ Metrics** (Target Metric)
   - Initiatives: "Target Metric" (Relation → Metrics, Single, опционально)
   - Metrics: "Targeted By Initiatives" (Relation → Initiatives, Many)

10. **Metrics ↔ Metrics** (Parent-Child)
    - Metrics: "Parent Metric" (Relation → Metrics, Single, опционально)
    - Metrics: "Child Metrics" (Relation → Metrics, Many)

11. **Goals ↔ Features**
    - Goals: "Features" (Relation → Goals, Many)
    - Features: "Goal" (Relation → Goals, Single, опционально)

12. **Hypotheses ↔ Features**
    - Hypotheses: "Features" (Relation → Features, Many)
    - Features: "Hypothesis" (Relation → Hypotheses, Single, опционально)

---

## Этап 3: Создание представлений (Views)

### 3.1. Страница "Strategy" (Стратегия)

Создать страницу с несколькими секциями:

**Секция 1: Product Formula**
- Использовать базу данных "Product Formulas" или обычную страницу
- Отобразить формулу для текущего продукта

**Секция 2: Values**
- Встроенная база данных "Values"
- Фильтр: Product = [текущий продукт]
- Сортировка: Position (Ascending)

**Секция 3: Metrics**
- Встроенная база данных "Metrics"
- Фильтр: Product = [текущий продукт]
- Представление: Hierarchy View (группировка по Parent Metric)

**Секция 4: Initiatives**
- Встроенная база данных "Initiatives"
- Фильтр: Product = [текущий продукт] AND Archived = false
- Сортировка: Priority (Ascending)

---

### 3.2. Страница "Roadmap" (Дорожная карта)

Создать страницу с базой данных "Goals":

**Основное представление:**
- Тип: Table View или Board View
- Группировка: Initiative (затем Quarter)
- Фильтр: Product = [текущий продукт] AND Archived = false
- Сортировка: Quarter (Ascending)

**Альтернативное представление (Board):**
- Тип: Board View
- Группировка: Quarter (столбцы)
- Фильтр: Product = [текущий продукт] AND Archived = false
- Сортировка: Initiative (Ascending)

**Примечания:**
- Drag & Drop между ячейками недоступен
- Для перемещения цели между инициативами/кварталами нужно редактировать вручную

---

### 3.3. Страница "Hypotheses" (Гипотезы)

Создать страницу с базой данных "Hypotheses":

**Основное представление:**
- Тип: Table View
- Фильтр: Product = [текущий продукт]
- Сортировка: Priority (Ascending), затем Status (Ascending)

**Дополнительные представления:**
- **By Status:** Группировка по Status
- **By Priority:** Сортировка по Priority

---

### 3.4. Страница "Board" (Доска)

Создать страницу с базой данных "Features":

**Основное представление:**
- Тип: Board View (Kanban)
- Группировка: Board Column
- Фильтр: Product = [текущий продукт]
- Сортировка: Position (Ascending)

**Дополнительные представления:**
- **Table View:** Все фичи в таблице
- **By Initiative:** Группировка по Initiative
- **By Hypothesis:** Группировка по Hypothesis

**Примечания:**
- Kanban поддерживается, но позиции нужно обновлять вручную
- Drag & Drop работает, но Position не обновляется автоматически

---

## Этап 4: Настройка фильтров по продуктам

### 4.1. Создание шаблона фильтра

Для каждой базы данных создать представление с фильтром по продукту:

1. Создать представление "Product Filter Template"
2. Добавить фильтр: Product = [выбранный продукт]
3. Сохранить как шаблон

### 4.2. Переключение между продуктами

**Вариант 1: Ручное переключение**
- В каждом представлении изменить фильтр на нужный продукт

**Вариант 2: Использование переменных (если доступно)**
- Создать переменную "Current Product"
- Использовать в фильтрах всех баз данных

**Вариант 3: Отдельные страницы для каждого продукта**
- Создать страницу для каждого продукта
- На каждой странице встроить базы данных с фильтром по продукту

---

## Этап 5: Настройка автоматизаций (опционально, платно)

### 5.1. Автоматическое обновление Position

**Проблема:** Position не обновляется автоматически при drag & drop

**Решение (через автоматизации):**
- Создать автоматизацию: "When item is moved in Board View"
- Обновить Position на основе нового порядка

**Ограничение:** Notion автоматизации платные и ограниченные

### 5.2. Автоматическое обновление Closed At

**Проблема:** Closed At не обновляется при перемещении в Done/Cancelled

**Решение:**
- Создать автоматизацию: "When Board Column changes to Done or Cancelled"
- Установить Closed At = now()

### 5.3. Автоматическая генерация Human Readable ID

**Проблема:** Human Readable ID через Formula не учитывает последовательную нумерацию

**Решение (частичное):**
- Использовать Formula с Position (как указано выше)
- Или создать автоматизацию для генерации уникального ID

---

## Этап 6: Компромиссы и ограничения

### 6.1. Принятые ограничения

1. **Human Readable ID:**
   - ✅ Формула для генерации префикса из Initiative
   - ❌ Автоматическая последовательная нумерация (нужно обновлять Position вручную)
   - ❌ Сквозная нумерация по продукту (только по Position в колонке)

2. **Drag & Drop:**
   - ✅ Kanban для Features работает
   - ❌ Drag & Drop между ячейками Roadmap недоступен
   - ❌ Position не обновляется автоматически

3. **Автоматизации:**
   - ❌ Автоматическое заполнение product_id (нужно выбирать вручную)
   - ❌ Автоматическое обновление timestamps (есть Created/Updated time)
   - ⚠️ Автоматизации доступны только в платных планах

4. **Product-based изоляция:**
   - ✅ Фильтры по продуктам работают
   - ❌ Нет RLS на уровне базы данных
   - ⚠️ Нужно вручную настраивать фильтры в каждом представлении

5. **Roadmap матрица:**
   - ✅ Группировка по Initiative и Quarter
   - ❌ Нет drag & drop между ячейками
   - ⚠️ Нужно редактировать вручную для перемещения целей

6. **Массивы метрик:**
   - ✅ Multi-select для Impact Metrics и Target Metrics
   - ❌ Нет автодополнения из базы Metrics (нужно вводить вручную)
   - ⚠️ Нет валидации существования метрики

7. **Цвета инициатив:**
   - ✅ Select с цветными опциями
   - ⚠️ Ограниченный набор цветов в Notion
   - ❌ Нет точного соответствия HEX-кодам

---

## Этап 7: Пошаговая инструкция по созданию

### Шаг 1: Создание баз данных

1. Создать все 9 баз данных (см. Этап 1)
2. Настроить все свойства для каждой базы
3. Убедиться, что все типы данных корректны

### Шаг 2: Настройка связей

1. Для каждой связи создать Relation в обе стороны
2. Настроить тип связи (Many-to-One, One-to-One, etc.)
3. Проверить, что связи работают корректно

### Шаг 3: Создание представлений

1. Для каждой базы создать необходимые представления
2. Настроить фильтры по продуктам
3. Настроить сортировки и группировки

### Шаг 4: Создание страниц

1. Создать страницу "Strategy" с встроенными базами данных
2. Создать страницу "Roadmap" с базой Goals
3. Создать страницу "Hypotheses" с базой Hypotheses
4. Создать страницу "Board" с базой Features

### Шаг 5: Настройка формул

1. Создать Formula для Human Readable ID в Features
2. Протестировать формулу на нескольких записях

### Шаг 6: Тестирование

1. Создать тестовый продукт
2. Создать тестовые данные для всех сущностей
3. Проверить все связи
4. Проверить все представления
5. Проверить фильтры

### Шаг 7: Миграция данных (если нужно)

1. Экспортировать данные из текущей системы
2. Импортировать в Notion (вручную или через API)
3. Проверить корректность данных

---

## Этап 8: Дополнительные улучшения

### 8.1. Использование Rollup для агрегации

Создать Rollup-поля для:
- Количество Features в каждой Initiative
- Количество Goals в каждой Initiative
- Количество Features для каждой Hypothesis
- Количество Features для каждой Goal

### 8.2. Использование Formula для вычислений

Создать Formula-поля для:
- Статус инициативы на основе связанных Goals
- Прогресс инициативы (Done Goals / Total Goals)
- Время в колонке (для Features)

### 8.3. Использование Templates

Создать шаблоны для:
- Новой фичи
- Новой гипотезы
- Новой цели
- Нового продукта

### 8.4. Использование Databases внутри Databases

Для более сложных структур можно использовать связанные базы данных:
- Features внутри Goals
- Goals внутри Initiatives
- Hypotheses внутри Features

---

## Заключение

Этот план описывает полную структуру миграции в Notion с учетом всех ограничений платформы. Основные компромиссы:

1. **Упрощенная автоматизация** - многие автоматические действия нужно выполнять вручную
2. **Ограниченный drag & drop** - работает только в Kanban, не работает в Roadmap
3. **Ручная настройка фильтров** - нужно вручную переключать фильтры по продуктам
4. **Упрощенный Human Readable ID** - без автоматической последовательной нумерации

Тем не менее, **основная структура данных и связи полностью воспроизводимы** в Notion, что позволяет использовать его как альтернативу текущей системе с принятием указанных ограничений.
