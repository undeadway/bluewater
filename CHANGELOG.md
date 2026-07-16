# Changelog

## 0.0.30 (2026-07-16)

### 🐛 修复
- MySQL 适配器路径错误：`./parts/` → `./base/`
- 缺失 `res/json/bluewater.json` 配置文件导致运行时崩溃
- `runQueryFunction`/`transaction`/`execute` 中引用未定义的 `dbName` 变量
- `queryFunction` 中通过未定义的 `db` 变量调用 adapter 方法（改用 `adapter` 实例）
- SQLite3 适配器全局 `fileName` 变量在多实例下的互相覆盖问题

### ✨ 改进
- **配置注入**：支持 `bluewater({ connections: {...} })` 直接传配置对象
- **惰性初始化**：移除模块加载时的同步文件 I/O，改为首次调用时按需加载
- **错误类型层次**：新增 `BwError`/`BwSqlError`/`BwParamError`/`BwConnectionError`
- **SQLite3 适配器重构**：复用 `base/index.js` 工厂，代码精简 50%
- **回调参数统一**：`query()` 的失败回调统一为 `fail`
- **适配器接口契约**：添加完整 JSDoc 类型定义
- **清理 Dead Code**：移除 `TypeMap.check()`、`getDatabaseInfo()` 等空实现

### 🧹 工程化
- 重命名 `test/lamdba.js` → `test/lambda.js`（修正拼写）
- 修复 `package.json` 中的无效 `scripts`
- 完善 `.gitignore`（添加日志、系统文件、coverage 等忽略项）
- 添加基础 ESLint 配置
