# API 参考

## bluewater()

```javascript
const bluewater = require("bluewater");
```

### 创建实例

```javascript
// 从默认路径（process.cwd() + "/res/json"）加载配置
const db = bluewater();

// 传入自定义配置对象
const db = bluewater({ /* config object */ });

// 指定使用配置中的某个数据库
const db = bluewater("mysql");
```

### 返回对象

返回的 `db` 对象包含以下核心方法：

## db.query(options)

执行单条 SQL 查询。

**参数：**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | SQL 定义名称（对应 `sql.json` 中的键名）或直接传入 SQL 语句 |
| `paras` | object | 否 | SQL 参数（键值对） |
| `method` | string | 否 | 操作类型（当 `name` 为直接 SQL 时需要）：`select`、`insert`、`update`、`delete` |
| `success` | function | 否 | 执行成功回调，接收结果集作为参数 |
| `fail` | function | 否 | 执行失败回调，接收错误对象作为参数 |

**示例：**

```javascript
db.query({
    name: "getUserById",
    paras: { id: 123 },
    success: (result) => {
        console.log(result); // [{ id: 123, userName: "Alice" }]
    },
    fail: (err) => {
        console.error(err);
    }
});
```

## db.transaction(queue, success, failed)

执行事务（多条 SQL 的有序执行）。

**参数：**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `queue` | array | 是 | SQL 队列，每个元素包含 `name`、`paras`、`success`（可选）、`alias`（可选） |
| `success` | function | 否 | 事务全部成功后的回调，接收所有结果集 |
| `failed` | function | 否 | 事务失败后的回调，接收错误对象 |

**示例：**

```javascript
db.transaction([
    {
        name: "addUser",
        paras: { name: "Bob", age: 25 },
        alias: "user"
    },
    {
        name: "addLog",
        paras: { action: "create_user", target: "Bob" },
        alias: "log"
    }
], (results) => {
    console.log("Transaction committed", results);
}, (err) => {
    console.error("Transaction failed", err);
});
```

事务流程：
1. 自动执行 `BEGIN`
2. 按顺序执行队列中的每条 SQL
3. 全部成功后自动执行 `COMMIT`
4. 任何一步失败则自动执行 `ROLLBACK`

## db.execute(queue, success, failed)

无需事务的多条 SQL 有序执行。

与 `transaction` 的区别在于不会开启和提交事务，适用于不需要原子性的批量操作。

**参数：** 同 `transaction`

## 方法式调用

当 `bluewater.json` 中配置 `"method-query": "ON"` 时，`sql.json` 中定义的所有查询名都会自动绑定为 `db` 实例的方法。

```javascript
// sql.json 中定义了 getList、addUser 等
db.getList({ paras: { status: 1 }, success: handler });
db.addUser({ paras: { name: "Alice" }, success: handler });
```

## bluewater.lambda(tableName)

Lambda 表达式查询构建器，用于以链式调用的方式构建简单的单表查询。

```javascript
const lambda = require("bluewater").lambda;

lambda("users")
    .equal("status", 1)
    .orderBy("created_at DESC")
    .select("*", (result) => {
        console.log(result);
    });
```

### 链式方法

| 方法 | 说明 |
| --- | --- |
| `select(columns, callback)` | 执行查询，`columns` 为字段名数组或 `"*"` |
| `insert(datas, callback)` | 执行插入 |
| `update(obj, callback)` | 执行更新 |
| `delete(callback)` | 执行删除 |
| `equal(column, value)` | 添加 `=` 条件 |
| `notEqual(column, value)` | 添加 `<>` 条件 |
| `overThan(column, value)` | 添加 `>` 条件 |
| `lessThan(column, value)` | 添加 `<` 条件 |
| `orderBy(column)` | 添加 `ORDER BY` |
| `groupBy(column)` | 添加 `GROUP BY` |
| `limit(from, count)` | 添加 `LIMIT` |
| `offset(count)` | 添加 `OFFSET` |
| `distinct(columns)` | 添加 `DISTINCT` |
| `having()` | 切换到 HAVING 条件模式 |

所有条件方法都返回 `lambda` 实例本身，支持链式调用。

## 错误类型

bluewater 定义了以下错误类型（定义在 `src/util/utils.js`）：

| 类型 | 说明 |
| --- | --- |
| `BwError` | 基础错误类 |
| `BwSqlError` | SQL 语法或定义错误 |
| `BwParamError` | 参数错误 |
| `BwConnectionError` | 数据库连接错误 |

## 缓存

bluewater 内置了查询缓存系统（`src/util/select-cache.js`），通过 MD5 哈希索引 SQL 和参数。

- 缓存仅对 `SELECT` 操作生效
- 通过 `use-cache` 配置启用
- 非 `SELECT` 操作会自动清空缓存
- 支持基于时间的缓存过期策略
