# 数据库适配器

## 概述

bluewater 是一个数据库驱动中介层，本身不包含任何数据库驱动。它通过适配器模式将不同数据库驱动的语法差异封装起来，对外提供统一的调用接口。

目前支持的数据库：

| 数据库 | 适配器文件 | 所需驱动 |
| --- | --- | --- |
| SQLite 3.7.2+ | `src/adapter/sqlite3.js` | `sqlite3` |
| PostgreSQL 9.2.24+ | `src/adapter/postgres.js` | `pg` |
| MySQL 8.4.0+ | `src/adapter/mysql.js` | `mysql2` |

## 适配器架构

```
src/adapter/
├── base/
│   ├── index.js       # 基类工厂 — SQL 编译 + 缓存
│   ├── engine.js      # SQL 编译引擎（标签语法解析）
│   └── connection.js  # 基础连接封装
├── mysql.js           # MySQL 适配器
├── postgres.js        # PostgreSQL 适配器
└── sqlite3.js         # SQLite3 适配器
```

### 基类（base/index.js）

基类工厂函数接收一个 `getPrepareMark` 参数，用于生成数据库原生的参数占位符。

```javascript
// MySQL / PostgreSQL 使用编号占位符
const base = require("./base")((paras) => `$${paras.length}`);

// SQLite3 使用 ? 占位符
const base = require("./base")(() => "?");
```

基类提供了以下公共能力：

| 方法 | 说明 |
| --- | --- |
| `compire(sql, sqlArgs)` | 编译带标签的 SQL 为原生 SQL + 参数数组 |
| `getRecordsList(rows)` | 将查询结果集字段从下划线命名转为驼峰命名 |
| `putCache(sql, param, records, timeout)` | 写入查询缓存 |
| `getCache(sql, param)` | 读取查询缓存 |
| `clearCache()` | 清空所有查询缓存 |
| `removeCache(sql, param)` | 移除指定查询的缓存 |
| `hasCache(sql, param)` | 检查是否存在缓存 |

### 连接层（base/connection.js）

基础连接层封装了数据库连接的基本操作：

| 方法 | 说明 |
| --- | --- |
| `tidyUp(obj)` | 结果后处理（默认原样返回，各适配器可覆盖） |
| `begin()` | 开启事务 |
| `commit()` | 提交事务 |
| `rollback()` | 回滚事务 |
| `prepare(sql)` | 预编译 SQL，返回 Statement 对象 |
| `close()` | 关闭连接 |

Statement 对象：

| 方法 | 说明 |
| --- | --- |
| `select(args)` | 执行查询 |
| `insert(args)` | 执行插入 |
| `update(args)` | 执行更新 |
| `delete(args)` | 执行删除 |
| `close()` | 释放语句资源 |

## 各适配器特性

### SQLite3

- 使用 `?` 作为参数占位符
- 单独实现了回调风格的连接/语句封装（因为 `sqlite3` 的 API 是回调风格而非 `conn.query` 风格）
- 支持 `getDBSize()` 获取数据库文件大小

### PostgreSQL

- 使用 `$n` 作为参数占位符
- 支持 `Client`、`Pool`、`Result` 等多种连接模式
- 支持 SSL、连接超时、连接池等高级配置
- 重写了 `tidyUp` 方法，自动提取 `rows` 字段

### MySQL

- 使用 `$n` 作为参数占位符（通过 `mysql2` 驱动）
- 支持 `Client`、`Pool`、`Result` 类型标识

## 自定义适配器

如果需要添加新的数据库支持，只需创建一个新的适配器文件（如 `src/adapter/oracle.js`），实现上述接口契约即可。
