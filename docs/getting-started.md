# 快速开始

## 安装

```bash
npm install bluewater
```

## 准备工作

1. 将 `res` 文件夹复制到**项目根目录**下。
2. 根据需要安装对应的数据库驱动（`bluewater` 本身不包含数据库驱动）：

| 数据库 | 驱动地址 |
| --- | --- |
| SQLite3 | https://github.com/mapbox/node-sqlite3 |
| PostgreSQL | https://github.com/brianc/node-postgres |
| MySQL | https://github.com/sidorares/node-mysql2 |

## 最简单的示例

在项目根目录的 `res/json/` 下配置好 `bluewater.json` 和 `sql.json` 后：

```javascript
const bluewater = require("bluewater");
const db = bluewater();

// 方法式调用（需开启 method-query）
db.getList({
    paras: { id: 123 },
    success: (result) => {
        console.log(result);
    },
    fail: (err) => {
        console.error(err);
    }
});
```

## 配置概览

`bluewater.json` 文件位于 `res/json/` 目录下，用于配置数据库连接信息和全局选项。

```json
{
    "database-name": "sqlite3",
    "connection": {
        "url": "./db/test.db",
        "name": "",
        "user": "",
        "passwd": ""
    },
    "method-query": "ON",
    "use-cache": "ON"
}
```

详细的配置说明请参阅 [配置文档](configuration.md)。

## 定义 SQL

在 `res/json/sql.json` 中定义 SQL 语句：

```json
{
    "getUserById": {
        "method": "select",
        "sql": "SELECT * FROM users WHERE id = #[id]"
    }
}
```

详细的 SQL 定义文档请参阅 [SQL 定义文档](sql-definition.md)。

## Node.js 版本要求

**因为使用了 `async/await`，请确保 Node.js 版本 >= 7.6。**
