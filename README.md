# Bluewater

> 一个基于 Node.js 的数据库接口适配器  
> A Node.js based database-agnostic database interface adapter

[![npm version](https://img.shields.io/npm/v/bluewater)](https://www.npmjs.com/package/bluewater)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

---

**中文** | [English](README.en.md)

---

## 目录

- [概述](#概述)
- [为什么需要 Bluewater？](#为什么需要-bluewater)
- [核心特性](#核心特性)
- [快速开始](#快速开始)
- [标签语法详解](#标签语法详解)
- [事务处理](#事务处理)
- [Lambda 查询构建器](#lambda-查询构建器)
- [查询缓存机制](#查询缓存机制)
- [多数据库切换](#多数据库切换)
- [适配器架构](#适配器架构)
- [错误处理](#错误处理)
- [完整文档索引](#完整文档索引)
- [项目结构](#项目结构)
- [许可证](#许可证)

## 概述

Bluewater 是一个与数据库无关的接口中间层，用于弥合 Node.js 生态中各种数据库驱动之间的语法和使用差异。它提供了一套**统一的调用方式**，让开发者可以用相同的代码风格操作 SQLite、PostgreSQL、MySQL 等不同数据库，切换数据库时只需修改一行配置，业务代码几乎无需改动。

```javascript
const bluewater = require("bluewater");
const db = bluewater();

db.getList({
    paras: { id: 123 },
    success: (result) => console.log(result)
});
```

### 设计思想

Bluewater 不直接操作数据库，而是作为一个"翻译官"：

- 开发者用统一的标签语法（`#[param]`、`?[condition]` 等）编写 SQL
- Bluewater 将其编译为目标数据库的原生 SQL 和参数数组
- 实际的数据读写操作委托给具体的数据库驱动执行

这种设计将 **SQL 编写**与**数据库实现**解耦，让同一套 SQL 定义文件可以在不同数据库间复用。

## 为什么需要 Bluewater？

在 Node.js 生态中，不同的数据库驱动有着截然不同的 API：

```javascript
// SQLite3 — 回调风格
db.all("SELECT * FROM users WHERE id = ?", [1], (err, rows) => {});

// PostgreSQL — 参数编号风格
client.query("SELECT * FROM users WHERE id = $1", [1]);

// MySQL2 — 对象风格
connection.execute("SELECT * FROM users WHERE id = ?", [1]);
```

每个驱动的连接方式、参数绑定语法、事务管理、结果集格式都不同。当项目需要切换数据库或同时使用多种数据库时，代码改造成本极高。

Bluewater 通过适配器模式统一了这一切：

```javascript
// 无论底层是什么数据库，调用方式完全一致
const db = bluewater("sqlite3"); // 或 bluewater("mysql")、bluewater("postgres")
db.getUserById({ paras: { id: 1 }, success: handler });
```

## 核心特性

- 🔌 **适配器模式** — 通过统一的接口层屏蔽各数据库驱动的差异，切换数据库只需改配置
- 🏷️ **标签语法** — 使用 `#[param]`、`?[condition]` 等标签编写动态 SQL，告别繁琐的字符串拼接
- 🛡️ **预编译安全** — 所有 SQL 均使用 Prepared Statement，有效防止 SQL 注入
- 📦 **查询缓存** — 内置智能缓存系统，基于访问频率自动管理热门/冷门查询的缓存策略
- 🔗 **事务支持** — 提供 `transaction` 和 `execute` 两种批量执行模式，自动处理 `BEGIN/COMMIT/ROLLBACK`
- ⛓️ **Lambda 构建器** — 支持链式调用的查询构建器，快速构建单表 CRUD
- 🔧 **可扩展** — 只需实现几个接口方法即可添加新的数据库适配器

## 快速开始

### 安装

```bash
npm install bluewater
```

### 三步上手

**1. 配置数据库连接**

```json
// res/json/bluewater.json
{
    "database-name": "sqlite3",
    "connection": {
        "url": "./db/test.db"
    },
    "method-query": "ON",
    "use-cache": "ON"
}
```

**2. 定义 SQL 语句**

```json
// res/json/sql.json
{
    "getUserById": {
        "method": "select",
        "sql": "SELECT * FROM users WHERE id = #[id]"
    },
    "addUser": {
        "method": "insert",
        "sql": "INSERT INTO users (name, age) VALUES (#[name], #[age])"
    },
    "updateUserName": {
        "method": "update",
        "sql": "UPDATE users SET name = #[name] WHERE id = #[id]"
    },
    "deleteUser": {
        "method": "delete",
        "sql": "DELETE FROM users WHERE id = #[id]"
    }
}
```

**3. 在代码中调用**

```javascript
const bluewater = require("bluewater");
const db = bluewater();

// 方法式调用（需开启 method-query）
db.addUser({
    paras: { name: "张三", age: 28 },
    success: (result) => console.log("新增成功", result),
    fail: (err) => console.error("新增失败", err)
});

// 标准调用
db.query({
    name: "getUserById",
    paras: { id: 1 },
    success: (result) => console.log(result)
});
```

## 标签语法详解

Bluewater 提供了四种自定义标签，由 SQL 编译引擎自动解析为目标数据库的原生语法。

### `#[param]` — 参数占位符（最常用）

自动将命名参数编译为数据库原生的预编译占位符：

```sql
-- 你写的 SQL
SELECT * FROM users WHERE id = #[id] AND status = #[status]
```

```javascript
// 传参
{ id: 123, status: "active" }
```

编译结果（以 PostgreSQL 为例）：
```sql
SELECT * FROM users WHERE id = $1 AND status = $2
-- 参数: [123, "active"]
```

编译结果（以 MySQL/SQLite3 为例）：
```sql
SELECT * FROM users WHERE id = ? AND status = ?
-- 参数: [123, "active"]
```

### `?[condition]` — 动态条件片段

根据参数的真值决定是否插入某段 SQL：

```sql
-- SQL 定义
SELECT * FROM notices WHERE timeout ?[inTime] ?[outTime] #[timeout]
```

```json
// sql.json 中的条件映射
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

```javascript
// 当 inTime=true 时，?[inTime] → " > "，否则被移除
db.listNotice({ paras: { inTime: true, outTime: false, timeout: "2026-01-01" }, ... });
// 编译为: SELECT * FROM notices WHERE timeout >  #[timeout]
```

### `?[condition(param)]` — 带参数的条件片段

可用于动态列名等更复杂的场景：

```sql
INSERT INTO orders (pk_column ?[hasColumn(name)]) VALUES (123 ?[hasColumn(value)])
```

```json
{
    "condition": {
        "hasColumn": {
            "name": ", discount",
            "value": ", #[discountVal]"
        }
    }
}
```

### `![pattern]` — LIKE 模糊匹配

```sql
SELECT * FROM users WHERE name LIKE ![%keyword%]
```

```javascript
{ keyword: "张" }
// 编译为: SELECT * FROM users WHERE name LIKE ?
// 参数: ["%张%"]
```

`%` 在标签内的位置决定了模糊匹配的方向（`%keyword` 左模糊、`keyword%` 右模糊、`%keyword%` 全模糊）。

### `&[func]` — 函数映射

将预定义的 SQL 片段插入到当前位置，通过 `res/json/funcs_map.json` 定义：

```json
// funcs_map.json
{ "orderBy": " ORDER BY " }
```

```sql
SELECT * FROM users WHERE name = #[name] &[orderBy]
```

编译为：`SELECT * FROM users WHERE name = ? ORDER BY`

## 事务处理

Bluewater 提供 `transaction` 方法专门处理事务，自动管理 `BEGIN/COMMIT/ROLLBACK`：

```javascript
db.transaction([
    {
        name: "deductBalance",
        paras: { userId: 1, amount: 100 },
        alias: "deduct"    // alias 用于在结果中标识该步骤的返回值
    },
    {
        name: "addOrder",
        paras: { userId: 1, amount: 100, product: "商品A" },
        alias: "order"
    },
    {
        name: "addLog",
        paras: { action: "purchase", detail: "用户1购买了商品A" }
    }
], (results) => {
    // 事务成功提交
    console.log("扣款结果:", results.deduct);
    console.log("订单结果:", results.order);
}, (err) => {
    // 事务回滚，所有步骤都无效
    console.error("事务失败，已回滚:", err);
});
```

执行流程：
1. 自动执行 `BEGIN` 开启事务
2. 按顺序依次执行队列中的每条 SQL
3. 全部成功 → 自动 `COMMIT` 提交
4. 任意一步失败 → 自动 `ROLLBACK` 回滚全部操作

如果不需要事务的原子性，只是需要顺序执行多条 SQL，可以使用 `execute`：

```javascript
db.execute([
    { name: "cleanExpiredData", paras: { date: "2026-01-01" } },
    { name: "recalculateSummary", paras: {} }
], (results) => { /* ... */ });
```

## Lambda 查询构建器

对于简单的单表 CRUD，Bluewater 提供了链式调用的 Lambda 构建器，无需预先定义 SQL：

```javascript
const lambda = bluewater.lambda;

// SELECT — 链式构建查询
lambda("users")
    .equal("status", 1)
    .overThan("age", 18)
    .orderBy("created_at DESC")
    .limit(0, 10)
    .select(["id", "name", "age"], (result) => {
        console.log(result);
    });

// INSERT
lambda("users")
    .insert([
        { name: { value: "'张三'", type: "varchar" }, age: { value: 28, type: "int" } }
    ], (result) => console.log(result));

// UPDATE
lambda("users")
    .equal("id", 1)
    .update({ name: "李四", age: 30 }, (result) => console.log(result));

// DELETE
lambda("users")
    .equal("status", 0)
    .delete((result) => console.log(result));
```

支持的链式条件方法：

| 方法 | 说明 |
| --- | --- |
| `equal(column, value)` | `=` 等于 |
| `notEqual(column, value)` | `<>` 不等于 |
| `overThan(column, value)` | `>` 大于 |
| `lessThan(column, value)` | `<` 小于 |
| `orderBy(column)` | 排序 |
| `groupBy(column)` | 分组 |
| `limit(from, count)` | 分页 |
| `offset(count)` | 偏移 |
| `distinct(columns)` | 去重 |
| `having()` | 切换到 HAVING 条件 |

## 查询缓存机制

Bluewater 内置了智能查询缓存（`src/util/select-cache.js`），**仅对 SELECT 操作生效**。

### 缓存策略

缓存采用 MD5 哈希索引，通过两级热度判断决定缓存策略：

- **热门查询**（访问频率 > 3 / 项目数）→ 全量内存缓存
- **冷门查询**（访问频率 < 0.1 / 项目数）→ 不缓存
- **中间地带** → 文件缓存（预留）

### 缓存行为

```javascript
// 第一次查询 — 查数据库，写入缓存
db.getUserById({ paras: { id: 1 }, success: handler });

// 第二次相同查询 — 直接从缓存读取（缓存未过期的情况下）
db.getUserById({ paras: { id: 1 }, success: handler });

// 非 SELECT 操作（INSERT/UPDATE/DELETE）— 自动清空相关缓存
db.addUser({ paras: { name: "新用户" }, success: handler });
```

缓存超时控制：
- `timeout: 0`（默认）— 立即过期，相当于不使用缓存
- `timeout: 3600` — 缓存 1 小时
- `timeout: -1` — 永久缓存

## 多数据库切换

Bluewater 支持同时管理多个数据库连接，或者在不同数据库间切换：

```javascript
// 方式1：在配置中定义多个数据库
// bluewater.json 的 connections 字段支持多库配置
const db = bluewater("mysql");   // 用 MySQL
const db2 = bluewater("pg");     // 用 PostgreSQL

// 方式2：传入配置对象
const db = bluewater({
    "connections": {
        "default": "sqlite3",
        "sqlite3": {
            "connection": { "url": "./db/test.db" },
            "method-query": "ON"
        }
    }
});
```

## 适配器架构

Bluewater 的适配器层采用三层架构：

```
┌──────────────────────────────────────────────────┐
│                  你的业务代码                       │
│    db.query() / db.transaction() / lambda()       │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│              Bluewater 核心 (src/index.js)         │
│  配置加载 · SQL 查找 · 方法绑定 · 事务编排          │
└──────┬──────────┬──────────┬─────────────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ MySQL    │ │PostgreSQL│ │ SQLite3  │
│ 适配器   │ │ 适配器   │ │ 适配器   │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     ▼            ▼            ▼
┌──────────────────────────────────────────────────┐
│               base/ (适配器基类)                   │
│  ┌─────────────┐  ┌─────────────┐                │
│  │ engine.js   │  │ connection  │                │
│  │ SQL 编译引擎 │  │ .js 连接封装 │                │
│  └─────────────┘  └─────────────┘                │
└──────────────────────────────────────────────────┘
```

每个数据库适配器只需实现：

| 方法 | 说明 |
| --- | --- |
| `connect(config)` | 创建数据库连接 |
| `compire(sql, args)` | SQL 编译（由基类提供） |
| `getRecordsList(rows)` | 结果集格式化（由基类提供） |
| `getDBSize()` | 获取数据库大小 |

## 错误处理

Bluewater 定义了层次化的错误类型：

```javascript
const { BwError, BwSqlError, BwParamError, BwConnectionError } = require("bluewater");

// 在回调中捕获
db.query({
    name: "getUserById",
    paras: { id: 1 },
    success: (result) => { /* ... */ },
    fail: (err) => {
        if (err instanceof BwSqlError) {
            console.error("SQL 定义错误:", err.message);
        } else if (err instanceof BwConnectionError) {
            console.error("数据库连接失败:", err.message);
        } else {
            console.error("其他错误:", err.message);
        }
    }
});
```

## 完整文档索引

| 文档 | 说明 |
| --- | --- |
| [快速开始](docs/getting-started.md) | 安装、配置、第一个示例 |
| [配置文档](docs/configuration.md) | `bluewater.json` 所有配置项详解 |
| [SQL 定义文档](docs/sql-definition.md) | `sql.json` 格式、四种标签语法完整说明、方法式调用 |
| [数据库适配器](docs/adapters.md) | 适配器架构、各适配器特性、如何自定义适配器 |
| [API 参考](docs/api.md) | 全部 API 的完整参考文档 |

## 项目结构

```
bluewater/
├── src/
│   ├── index.js                  # 入口，核心逻辑
│   ├── adapter/
│   │   ├── base/
│   │   │   ├── index.js          # 适配器基类工厂
│   │   │   ├── engine.js         # SQL 编译引擎
│   │   │   └── connection.js     # 基础连接封装
│   │   ├── mysql.js              # MySQL 适配器
│   │   ├── postgres.js           # PostgreSQL 适配器
│   │   └── sqlite3.js            # SQLite3 适配器
│   ├── query-builder/
│   │   └── lambda.js             # Lambda 查询构建器
│   └── util/
│       ├── archive.js            # 归档工具
│       ├── select-cache.js       # 查询缓存
│       └── utils.js              # 工具函数与错误类型
├── res/json/
│   ├── bluewater.json            # 配置文件
│   ├── bluewater.mysql.json      # MySQL 配置示例
│   ├── bluewater.pg.json         # PostgreSQL 配置示例
│   ├── bluewater.sqlite.json     # SQLite3 配置示例
│   ├── funcs_map.json            # 函数映射表
│   └── sql.json                  # SQL 定义
├── docs/                         # 文档目录
├── test/                         # 测试
└── package.json
```

## 支持的数据库

| 数据库 | 最低版本 | 所需驱动 |
| --- | --- | --- |
| SQLite3 | 3.7.2 | [node-sqlite3](https://github.com/mapbox/node-sqlite3) |
| PostgreSQL | 9.2.24 | [node-postgres](https://github.com/brianc/node-postgres) |
| MySQL | 8.4.0 | [mysql2](https://github.com/sidorares/node-mysql2) |

## 许可证

[Apache-2.0](LICENSE)