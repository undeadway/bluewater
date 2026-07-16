# Bluewater

> A Node.js based database-agnostic database interface adapter

[![npm version](https://img.shields.io/npm/v/bluewater)](https://www.npmjs.com/package/bluewater)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

---

[中文](./README.md) | **English**

---

## Table of Contents

- [Overview](#overview)
- [Why Bluewater?](#why-bluewater)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Tag Syntax Reference](#tag-syntax-reference)
- [Transactions](#transactions)
- [Lambda Query Builder](#lambda-query-builder)
- [Query Cache](#query-cache)
- [Switching Databases](#switching-databases)
- [Adapter Architecture](#adapter-architecture)
- [Error Handling](#error-handling)
- [Documentation Index](#documentation-index)
- [Project Structure](#project-structure)
- [License](#license)

## Overview

Bluewater is a database-agnostic interface middleware layer for Node.js, designed to bridge the usage discrepancies caused by diverse database driver syntaxes. It provides a **unified calling approach** that allows developers to work with SQLite, PostgreSQL, MySQL, and other databases using the same code style — switching databases requires only a single config change.

```javascript
const bluewater = require("bluewater");
const db = bluewater();

db.getList({
    paras: { id: 123 },
    success: (result) => console.log(result)
});
```

### Design Philosophy

Bluewater does **not** operate databases directly — it acts as a **translator**:

- Developers write SQL using unified tag syntax (`#[param]`, `?[condition]`, etc.)
- Bluewater compiles it into the target database's native SQL + parameter array
- The actual data operations are delegated to the specific database driver

This decouples **SQL authoring** from **database implementation**, allowing the same SQL definition files to be reused across different databases.

## Why Bluewater?

Different database drivers in Node.js have vastly different APIs:

```javascript
// SQLite3 — callback style
db.all("SELECT * FROM users WHERE id = ?", [1], (err, rows) => {});

// PostgreSQL — numbered parameters
client.query("SELECT * FROM users WHERE id = $1", [1]);

// MySQL2 — object style
connection.execute("SELECT * FROM users WHERE id = ?", [1]);
```

Each driver has its own connection method, parameter binding syntax, transaction management, and result set format. Switching databases or using multiple databases simultaneously requires massive code refactoring.

Bluewater unifies everything through the adapter pattern:

```javascript
// Identical API regardless of the underlying database
const db = bluewater("sqlite3"); // or bluewater("mysql"), bluewater("postgres")
db.getUserById({ paras: { id: 1 }, success: handler });
```

## Key Features

- 🔌 **Adapter Pattern** — Unified interface layer abstracts away driver differences
- 🏷️ **Tag Syntax** — Write dynamic SQL with `#[param]`, `?[condition]` tags
- 🛡️ **Prepared Statements** — All SQL uses prepared statements for SQL injection prevention
- 📦 **Query Cache** — Built-in intelligent cache with hot/cold query management
- 🔗 **Transaction Support** — `transaction` and `execute` for batch operations, auto `BEGIN/COMMIT/ROLLBACK`
- ⛓️ **Lambda Builder** — Chainable query builder for simple single-table CRUD
- 🔧 **Extensible** — Add new database adapters by implementing a few interface methods

## Quick Start

### Install

```bash
npm install bluewater
```

### Three Steps to Use

**1. Configure database connection**

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

**2. Define SQL statements**

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

**3. Call from your code**

```javascript
const bluewater = require("bluewater");
const db = bluewater();

// Method-style call (requires method-query: "ON")
db.addUser({
    paras: { name: "Alice", age: 28 },
    success: (result) => console.log("Created", result),
    fail: (err) => console.error("Failed", err)
});

// Standard call
db.query({
    name: "getUserById",
    paras: { id: 1 },
    success: (result) => console.log(result)
});
```

## Tag Syntax Reference

Bluewater provides four custom tag types, parsed by the compilation engine into native database syntax.

### `#[param]` — Parameter Placeholder (Most Common)

Automatically compiles named parameters into database-native prepared statement placeholders:

```sql
-- Your SQL
SELECT * FROM users WHERE id = #[id] AND status = #[status]
```

```javascript
// Parameters
{ id: 123, status: "active" }
```

Compiled (PostgreSQL):
```sql
SELECT * FROM users WHERE id = $1 AND status = $2
-- Params: [123, "active"]
```

Compiled (MySQL/SQLite3):
```sql
SELECT * FROM users WHERE id = ? AND status = ?
-- Params: [123, "active"]
```

### `?[condition]` — Dynamic Condition Snippet

Conditionally inserts SQL fragments based on parameter truthiness:

```sql
SELECT * FROM notices WHERE timeout ?[inTime] ?[outTime] #[timeout]
```

```json
// sql.json condition mapping
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
// When inTime=true: ?[inTime] → " > ", otherwise removed
db.listNotice({ paras: { inTime: true, outTime: false, timeout: "2026-01-01" }, ... });
// Compiled: SELECT * FROM notices WHERE timeout >  #[timeout]
```

### `?[condition(param)]` — Conditional with Parameters

For more complex scenarios like dynamic column names:

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

### `![pattern]` — LIKE Fuzzy Match

```sql
SELECT * FROM users WHERE name LIKE ![%keyword%]
```

```javascript
{ keyword: "Ali" }
// Compiled: SELECT * FROM users WHERE name LIKE ?
// Params: ["%Ali%"]
```

The position of `%` controls the matching direction (`%keyword` = left, `keyword%` = right, `%keyword%` = full).

### `&[func]` — Function Mapping

Inserts predefined SQL fragments defined in `res/json/funcs_map.json`:

```json
// funcs_map.json
{ "orderBy": " ORDER BY " }
```

```sql
SELECT * FROM users WHERE name = #[name] &[orderBy]
```

Compiles to: `SELECT * FROM users WHERE name = ? ORDER BY`

## Transactions

Bluewater provides a `transaction` method that automatically manages `BEGIN/COMMIT/ROLLBACK`:

```javascript
db.transaction([
    {
        name: "deductBalance",
        paras: { userId: 1, amount: 100 },
        alias: "deduct"
    },
    {
        name: "addOrder",
        paras: { userId: 1, amount: 100, product: "Product A" },
        alias: "order"
    },
    {
        name: "addLog",
        paras: { action: "purchase", detail: "User 1 bought Product A" }
    }
], (results) => {
    // All operations committed successfully
    console.log("Deduction result:", results.deduct);
    console.log("Order result:", results.order);
}, (err) => {
    // All operations rolled back
    console.error("Transaction failed, rolled back:", err);
});
```

**Execution flow:**
1. Automatically executes `BEGIN` to start the transaction
2. Executes each SQL in the queue sequentially
3. All succeed → auto `COMMIT`
4. Any step fails → auto `ROLLBACK` for all operations

If you don't need atomicity but just need sequential execution, use `execute`:

```javascript
db.execute([
    { name: "cleanExpiredData", paras: { date: "2026-01-01" } },
    { name: "recalculateSummary", paras: {} }
], (results) => { /* ... */ });
```

## Lambda Query Builder

For simple single-table CRUD operations, Bluewater offers a chainable Lambda builder — no need to predefine SQL:

```javascript
const lambda = bluewater.lambda;

// SELECT — chain-style query building
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
        { name: { value: "'Alice'", type: "varchar" }, age: { value: 28, type: "int" } }
    ], (result) => console.log(result));

// UPDATE
lambda("users")
    .equal("id", 1)
    .update({ name: "Bob", age: 30 }, (result) => console.log(result));

// DELETE
lambda("users")
    .equal("status", 0)
    .delete((result) => console.log(result));
```

**Chainable methods:**

| Method | Description |
| --- | --- |
| `equal(column, value)` | `=` equals |
| `notEqual(column, value)` | `<>` not equals |
| `overThan(column, value)` | `>` greater than |
| `lessThan(column, value)` | `<` less than |
| `orderBy(column)` | Ordering |
| `groupBy(column)` | Grouping |
| `limit(from, count)` | Pagination |
| `offset(count)` | Offset |
| `distinct(columns)` | Deduplication |
| `having()` | Switch to HAVING mode |

## Query Cache

Bluewater has a built-in intelligent query cache (`src/util/select-cache.js`), **only effective for SELECT operations**.

### Cache Strategy

The cache uses MD5 hash indexing with a two-tier hotness assessment:

- **Hot queries** (access frequency > 3 / total items) → full memory cache
- **Cold queries** (access frequency < 0.1 / total items) → no caching
- **Middle ground** → file cache (reserved)

### Cache Behavior

```javascript
// First query — hits the database, writes to cache
db.getUserById({ paras: { id: 1 }, success: handler });

// Same query again — reads from cache (if not expired)
db.getUserById({ paras: { id: 1 }, success: handler });

// Non-SELECT operations (INSERT/UPDATE/DELETE) — auto clear related cache
db.addUser({ paras: { name: "New User" }, success: handler });
```

**Cache timeout control:**
- `timeout: 0` (default) — expires immediately, effectively no cache
- `timeout: 3600` — caches for 1 hour
- `timeout: -1` — permanent cache

## Switching Databases

Bluewater supports managing multiple database connections simultaneously:

```javascript
// Option 1: Define multiple databases in config, specify which to use
const db = bluewater("mysql");
const db2 = bluewater("pg");

// Option 2: Pass a configuration object directly
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

## Adapter Architecture

Bluewater's adapter layer follows a three-tier architecture:

```
┌──────────────────────────────────────────────────┐
│                  Your Business Code               │
│    db.query() / db.transaction() / lambda()       │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│            Bluewater Core (src/index.js)          │
│  Config loading · SQL lookup · Method binding     │
│  Transaction orchestration                        │
└──────┬──────────┬──────────┬─────────────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ MySQL    │ │PostgreSQL│ │ SQLite3  │
│ Adapter  │ │ Adapter  │ │ Adapter  │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     ▼            ▼            ▼
┌──────────────────────────────────────────────────┐
│               base/ (Adapter Base)                │
│  ┌─────────────┐  ┌─────────────┐                │
│  │ engine.js   │  │ connection  │                │
│  │ SQL Compiler│  │ .js Wrapper │                │
│  └─────────────┘  └─────────────┘                │
└──────────────────────────────────────────────────┘
```

Each database adapter must implement:

| Method | Description |
| --- | --- |
| `connect(config)` | Create database connection |
| `compire(sql, args)` | SQL compilation (provided by base) |
| `getRecordsList(rows)` | Result set formatting (provided by base) |
| `getDBSize()` | Get database file size |

## Error Handling

Bluewater defines hierarchical error types for precise error handling:

```javascript
const { BwError, BwSqlError, BwParamError, BwConnectionError } = require("bluewater");

// Catch in callback
db.query({
    name: "getUserById",
    paras: { id: 1 },
    success: (result) => { /* ... */ },
    fail: (err) => {
        if (err instanceof BwSqlError) {
            console.error("SQL definition error:", err.message);
        } else if (err instanceof BwConnectionError) {
            console.error("Connection failed:", err.message);
        } else {
            console.error("Other error:", err.message);
        }
    }
});
```

## Documentation Index

| Document | Description |
| --- | --- |
| [Getting Started](docs/getting-started.md) | Installation, configuration, first example |
| [Configuration](docs/configuration.md) | `bluewater.json` configuration reference |
| [SQL Definition](docs/sql-definition.md) | SQL definition format, tag syntax, method calls |
| [Adapters](docs/adapters.md) | Supported databases, adapter architecture |
| [API Reference](docs/api.md) | Complete API documentation |

## Project Structure

```
bluewater/
├── src/
│   ├── index.js                  # Entry point & core logic
│   ├── adapter/
│   │   ├── base/
│   │   │   ├── index.js          # Adapter base factory
│   │   │   ├── engine.js         # SQL compilation engine
│   │   │   └── connection.js     # Base connection wrapper
│   │   ├── mysql.js              # MySQL adapter
│   │   ├── postgres.js           # PostgreSQL adapter
│   │   └── sqlite3.js            # SQLite3 adapter
│   ├── query-builder/
│   │   └── lambda.js             # Lambda query builder
│   └── util/
│       ├── archive.js            # Archive utility
│       ├── select-cache.js       # Query cache
│       └── utils.js              # Utility functions & error types
├── res/json/
│   ├── bluewater.json            # Configuration file
│   ├── bluewater.mysql.json      # MySQL config example
│   ├── bluewater.pg.json         # PostgreSQL config example
│   ├── bluewater.sqlite.json     # SQLite3 config example
│   ├── funcs_map.json            # Function mapping table
│   └── sql.json                  # SQL definitions
├── docs/                         # Documentation directory
├── test/                         # Tests
└── package.json
```

## Supported Databases

| Database | Min Version | Required Driver |
| --- | --- | --- |
| SQLite3 | 3.7.2 | [node-sqlite3](https://github.com/mapbox/node-sqlite3) |
| PostgreSQL | 9.2.24 | [node-postgres](https://github.com/brianc/node-postgres) |
| MySQL | 8.4.0 | [mysql2](https://github.com/sidorares/node-mysql2) |

## License

[Apache-2.0](LICENSE)