# 配置文档

## bluewater.json

`bluewater.json` 是 bluewater 的核心配置文件，位于 `res/json/` 目录下。

### 基本结构

```json
{
    "database-name": "sqlite3",
    "connection": {
        "url": "",
        "name": "",
        "user": "",
        "passwd": ""
    },
    "port": "",
    "method-query": "ON",
    "use-cache": "ON",
    "archive": {
        "dir": "./archive/",
        "type": "json",
        "interval": ""
    }
}
```

### 配置项说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `database-name` | string | 是 | 数据库类型，可选值：`sqlite3`、`postgres`、`mysql` |
| `connection.url` | string | 是 | 数据库连接地址（SQLite 为文件路径，其他为主机地址） |
| `connection.name` | string | 否 | 数据库名 |
| `connection.user` | string | 否 | 数据库用户名 |
| `connection.passwd` | string | 否 | 数据库用户密码 |
| `port` | string | 否 | 数据库端口（如 MySQL 默认 3306，PostgreSQL 默认 5432） |
| `method-query` | string | 否 | 是否启用方法式调用，设为 `"ON"` 开启 |
| `use-cache` | string | 否 | 是否启用查询缓存，设为 `"ON"` 开启 |
| `archive.dir` | string | 否 | 归档目录路径 |
| `archive.type` | string | 否 | 归档文件格式（如 `json`） |
| `archive.interval` | string | 否 | 归档间隔时间 |

### 数据库配置文件

bluewater 支持为不同数据库准备独立的配置文件。在 `res/json/` 目录下可以存放多个配置：

- `bluewater.json` — 默认配置
- `bluewater.mysql.json` — MySQL 配置示例
- `bluewater.pg.json` — PostgreSQL 配置示例
- `bluewater.sqlite.json` — SQLite 配置示例

### 编程式配置

除了通过文件加载配置，也可以直接传入配置对象：

```javascript
const bluewater = require("bluewater");

const db = bluewater({
    "connections": {
        "default": "sqlite3",
        "sqlite3": {
            "connection": {
                "url": "./db/test.db"
            }
        }
    },
    "method-query": "ON",
    "use-cache": "ON"
});
```

## funcs_map.json

`funcs_map.json` 用于定义 SQL 函数映射，配合 `&[functionName]` 标签使用：

```json
{
    "orderBy": " ORDER BY "
}
```

在 SQL 中通过 `&[orderBy]` 引用，编译时会被替换为对应的函数片段。
