# SQL 定义文档

## sql.json

在 `bluewater.json` 的同目录下建立 `sql.json` 文件，用于集中管理所有 SQL 语句。

## 基本格式

```json
{
    "getUserById": {
        "method": "select",
        "sql": "SELECT * FROM users WHERE id = #[id]",
        "timeout": 0
    }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `method` | string | 是 | 操作类型：`select`、`insert`、`update`、`delete`、`procedure` |
| `sql` | string | 是 | SQL 语句，支持 bluewater 标签语法 |
| `timeout` | number | 否 | 缓存超时时间（秒），`0` 表示立即过期，`< 0` 表示永久缓存 |
| `condition` | object | 否 | 条件片段定义，用于动态拼接 SQL |

### 调用方式（标准）

```javascript
db.query({
    name: "getUserById",
    paras: { id: 1234567890 },
    success: (result) => { /* ... */ },
    fail: (err) => { /* ... */ }
});
```

## 标签语法

bluewater 提供了 SQL 标签语法，由编译引擎（`src/adapter/base/engine.js`）解析。

### `#[param]` — 参数占位符

最常用的标签，用于传入参数值：

```sql
SELECT * FROM users WHERE id = #[id] AND status = #[status]
```

传入参数：

```javascript
{
    id: 123,
    status: "active"
}
```

编译后的 SQL 使用数据库原生的预编译占位符（如 `$1`、`?`），参数值单独传入，防止 SQL 注入。

### `?[condition]` — 条件片段

用于根据条件动态拼接 SQL 片段：

```sql
SELECT * FROM notices ?[inTime] ?[outTime]
```

配置中的定义：

```json
{
    "listNotice": {
        "method": "select",
        "sql": "SELECT * FROM notices WHERE timeout ?[inTime] ?[outTime] #[timeout]",
        "condition": {
            "inTime": " > ",
            "outTime": " <= "
        }
    }
}
```

当传入的参数中 `inTime` 为 truthy 值时，`?[inTime]` 会被替换为 ` > `，否则被替换为空字符串。

### `?[condition(param)]` — 带参数的动态条件

用于更复杂的场景，如动态列名：

```sql
INSERT INTO table (pk_column ?[hasColumn(name)]) VALUES (123 ?[hasColumn(value)])
```

配置：

```json
{
    "condition": {
        "hasColumn": {
            "name": ", column_name",
            "value": ", #[column]"
        }
    }
}
```

### `![like]` — LIKE 模糊匹配

用于 LIKE 查询中的模式匹配：

```sql
SELECT * FROM users WHERE name LIKE ![%keyword%]
```

传入参数：

```javascript
{
    keyword: "test"
}
```

最终编译为：`WHERE name LIKE ?`，参数值为 `%test%`。

### `&[function]` — 函数映射

用于将预定义的函数片段插入 SQL 中：

```sql
SELECT * FROM users WHERE name = #[name] &[orderBy]
```

需要通过 `funcs_map.json` 定义映射：

```json
{
    "orderBy": " ORDER BY "
}
```

最终编译为：`SELECT * FROM users WHERE name = ? ORDER BY`。

## 高级格式

### 方法式调用

当 `bluewater.json` 中的 `method-query` 设置为 `"ON"` 时，可以省略 `query()` 调用中的 `name` 字段，直接以方法名调用：

```javascript
// 标准调用
db.query({
    name: "getList",
    paras: { id: 1234567890 },
    success: (result) => { /* ... */ }
});

// 方法式调用（需开启 method-query）
db.getList({
    paras: { id: 1234567890 },
    success: (result) => { /* ... */ }
});
```

方法式调用会将 `sql.json` 中定义的所有键名绑定为 `db` 实例的方法。

### 直接传入 SQL

如果 `sql.json` 中没有定义指定的查询名称，bluewater 会将 `queryName` 直接作为 SQL 语句执行：

```javascript
db.query({
    name: "SELECT * FROM users WHERE id = #[id]",
    method: "select",
    paras: { id: 123 },
    success: (result) => { /* ... */ }
});
```

### 完整示例

```json
{
    "getByA": {
        "method": "select",
        "sql": "SELECT * FROM test WHERE a = #[a]"
    },
    "add": {
        "method": "insert",
        "sql": "INSERT INTO test (a, b, c) VALUES (#[a], #[b], #[c])"
    },
    "editByA": {
        "method": "update",
        "sql": "UPDATE test SET b = #[b], c = #[c] WHERE a = #[a]"
    },
    "delByA": {
        "method": "delete",
        "sql": "DELETE FROM test WHERE a = #[a]"
    },
    "testLike": {
        "method": "select",
        "sql": "SELECT * FROM newtable WHERE column1 LIKE ![%test%] AND column2 = #[c2] &[orderBy]"
    }
}
```
