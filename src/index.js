/**
 * 一个基于 Node.js的数据库接口适配器
 * 与数据库无关的接口库，用于弥合各种不同的数据库驱动的语法造成的差异
 * 使用的时候只要 
 * let sql = require("bluewater");
 * let db = bluewater();
 * 就能获得 bluewater 的引用
 * 
 * 最后用 db 变量来调用定义好的方法，如：
 * db.getList(); // 这个list 方法定义在 sql.json 中
 * bluewater只负责将 getList 要进行的是哪种操作（增删改查）、所要操作的sql 等
 * 映射到各个数据库驱动中去，但 如何实现 getList
 * 实际的操作依然还是交给各个数据库驱动自己去实现
 * 
 * 现在所有 sql 都定义在一个大对象下， sql 不多的时候可以这么搞，
 * 今后sql多了以后，要考虑将这些 sql 拆成多个子对象（命名空间概念）分别加载
 * 类似 mybatis 的分 xml 文件 或者分 类来加载 sql
 */
const path = require("path");
const { readFileSync, existsSync } = require("fs");
const archive = require("./util/archive");
const JsLog = require('jslog');
const STR_SELECT = "select", STR_ARRAY = "array";

const jslog = new JsLog();

// 数据库中间驱动可以使用的数据方法，即实现 bluewater 接口所需要实现的方法
const VALID_METHODS = ["insert", "delete", "update", STR_SELECT
	// TODO bluewater 暂时不支持所定义的 SQL 操作：
	// ,trigger
	,"procedure"
	// ,"function"
];

// ---- 配置管理（惰性初始化，消除模块加载副作用） ----

let inited = false;
let BW_DB_CONFIGS = null;
let useCache = false;
let DEFAULT_DB_NAME = "";
let methodQuery = false;
let configResDir = null;

/**
 * 从文件加载 bluewater.json 配置
 */
function loadConfigFromFile(configDir) {
	const filePath = path.resolve(configDir, "bluewater.json");
	return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * 读取 SQL 定义文件（惰性加载，按需读取）
 */
function getSqlDefinitions(dbName, configDir) {
	const sqlPath = path.resolve(configDir || configResDir, `sql-${dbName}.json`);
	return existsSync(sqlPath) ? JSON.parse(readFileSync(sqlPath, "utf-8")) : {};
}

/**
 * 获取数据库适配器（惰性 require）
 */
function getAdapter(dbName) {
	return require(`./adapter/${dbName}`);
}

/**
 * 初始化配置（仅在首次调用 bluewater() 时执行）
 * 支持传入配置对象或配置目录路径
 */
function initConfig(config) {
	if (inited) return;

	if (typeof config === 'object' && config !== null) {
		// 方式1：直接传入配置对象
		applyConfig(config, null);
	} else {
		// 方式2：从文件系统加载配置
		const configDir = config || (process.cwd() + "/res/json");
		const database = loadConfigFromFile(configDir);
		configResDir = configDir;
		applyConfig(database, configDir);
	}

	inited = true;
}

function applyConfig(database, configDir) {
	const STR_ON = "ON";
	useCache = database["use-cache"] === STR_ON;
	methodQuery = database["method-query"] === STR_ON;
	configResDir = configDir;

	BW_DB_CONFIGS = database.connections;

	let defaultDbName = BW_DB_CONFIGS.default;
	delete BW_DB_CONFIGS.default;

	if (!defaultDbName) {
		let dbNames = Object.keys(BW_DB_CONFIGS);
		if (!dbNames || dbNames.length === 0) {
			throw new Error("请至少配置一个数据库！");
		}
		defaultDbName = dbNames[0];
	}
	DEFAULT_DB_NAME = defaultDbName;

	// 归档初始化（如果配置中有 archive 字段）
	archive.init(database.archive);
}

// ---- SQL 错误 ----

function sqlError(msg) {
	throw new Error(msg || "SQL 错误");
}

// ---- 核心查询函数 ----

async function queryFunction({ queryName, paras, method, typeName }, conn, dbName) {

	let __sql, sqlArgs, _method, _timeout = 0;
	const BW_SQL_DEF = getSqlDefinitions(dbName, configResDir);
	const adapter = getAdapter(dbName);

	if (BW_SQL_DEF[queryName]) { // 如果 queryName 被定义，则走定义好的 sql
		let { method, sql, timeout, condition } = BW_SQL_DEF[queryName];

		if (!method) { // 检查各种定义
			sqlError(`sql.json 中 ${queryName} 没有定义 method`);
		}
		if (!sql) { // 检查各种定义
			sqlError(`sql.json 中 ${queryName} 没有定义 sql`);
		}

		__sql = sql;
		_timeout = timtout = timeout || 0;

		_method = String.trim(method.toLowerCase());

		sqlArgs = {
			from: paras,
			condition: condition
		};
		
	} else {// 如果 BW_SQL_DEF 中没有定义，则认为 传入 的 queryName 是条 sql，而不管其是否真的是一条 sql （即不判断语法合规性）
		__sql = queryName;
		queryName = `${typeName} ${method}`;
		sqlArgs = paras;
		_method = method;
	}

	if (!Array.has(VALID_METHODS, _method)) sqlError(`bluewater 暂时不支持 ${_method} 。`);

	let [_sql, sqlPara] = adapter.compire(__sql, sqlArgs);
	let stmt = conn.prepare(_sql); // 实例化 stmt 并获得执行方法
	
	async function closeStmt() {
		if (stmt) {
			await stmt.close();
			stmt = null;
		}
	}

	try {
		if (!stmt) sqlError("无法建立起目标数据库的连接。 ");
		if (useCache && method === STR_SELECT) {
			// 当处理类型为 select 且判断使用 cache 的时候，先从缓存中查找是否有已有已被缓存的对象
			let result = adapter.getCache(_sql, sqlPara);
			if (result !== null) {
				jslog.log(`${queryName} data get from cache.`);
				return result;
			}
		} else {
			adapter.clearCache(); // 非 select 或 不使用 cache 操作的时候，清空缓存
		}

		let stmtMethod = stmt[_method];

		if (!stmtMethod) sqlError(`${dbName} 暂时不支持所定义的 ${_method} 操作： `);

		// 执行数据库
		jslog.log(`${queryName} start # ${_method}`);
		jslog.log(_sql);
		jslog.log("args : " + JSON.stringify(sqlPara));

		let result = await stmtMethod(sqlPara);
		if (_method === STR_SELECT) {
			result = adapter.getRecordsList(result);
		}

		if (useCache && _method === STR_SELECT) { // 把搜索到的结果集放到缓存中
			adapter.putCache(_sql, sqlPara, result, _timeout);
		}

		return conn.tidyUp(result);
	} catch (e) {
		jslog.error(e);
		throw e;
	} finally {
		await closeStmt();
	}
}

/*
 * 主函数
 * 
 * 通过 let db = bluewater(); 来创建 connetion 的实例
 * 外部调用不用知道内部逻辑，也不用连接 statement(默认都是 prepare 级的)
 * 具体的如何实现 prepare 则交给各个数据库的驱动自己来实现
 * 在 connetcion 创建之后，只要通过 其实例调用在 sql.json 中定义好的方法就可以了。
 * 
 * 例：
 * let db = bluewater();
 * db.getList({
 * 	condition : {},
 * 	success : [Function],
 * 	fail : [Function]
 * });
 * 
 * success : 数据库执行成功后的回调函数（后处理）
 * fail : 数据库执行失败情况下的处理，如果不提供，bluewater 会有一个默认函数来执行，但默认函数只会将错误记录，而不会去解决错误
 * condition : 执行 该 sql 所需要的参数
 */
function bluewater(usingDbName) {

	// 首次调用时初始化配置
	// 支持两种调用方式：
	//   bluewater()                    — 从默认路径加载配置
	//   bluewater({ database, ... })   — 直接传入配置对象
	//   bluewater("mysql")             — 使用配置中的指定数据库名
	if (!inited) {
		if (typeof usingDbName === 'object' && usingDbName !== null) {
			initConfig(usingDbName);
			usingDbName = undefined;
		} else {
			initConfig();
		}
	}

	const finalDbName = usingDbName || DEFAULT_DB_NAME;
	const conn = getAdapter(finalDbName).connect(BW_DB_CONFIGS[finalDbName]);

	async function closeConn() {
		if (conn) {
			await conn.close();
			conn = null;
		}
	}

	async function runQueryFunction(queryName, arg) {
		try {
			let result = await queryFunction( 
				{ queryName, paras: arg.condition, method: arg.method, typeName: arg.typeName }, 
				conn, finalDbName);
			if (arg.success) arg.success(result);
		} catch (e) {
			jslog.error(e);
			if (arg.fail) {
				arg.fail(e);
			}
		} finally {
			await closeConn();
		}
	}

	const bwObj = {
		// 执行单条sql
		query: async (arg) => {
			await runQueryFunction(arg.name, arg);
		},
		// 专门用于事务（多条sql的有序执行）
		transaction: async (queue, success, failed) => {
			try {
				await conn.begin();
				let results = {};
				let item = null;
				while ((item = queue.shift()) !== undefined) {
					let result = await queryFunction({ queryName: item.name, paras: item.condition }, conn, finalDbName);
					if (item.success) {
						item.success(result);
					} else { // 在没有对每个处理都定义 success 的时候，将所有返回值都放到最后统一处理
						let alias = item.alias || item.name;
						let ret = results[alias];
						if (!ret) {
							results[alias] = result;
						} else {
							if (typeIs(ret, STR_ARRAY)) {
								results[alias] = ret.concat(result);
							} else {
								results[alias] = [ret];
								results[alias].push(result);
							}
						}
					}
				}
				await conn.commit();
				if (success) success(results);
			} catch (e) {
				jslog.error(e);
				await conn.rollback();
				e.code = 500;
				if (failed) failed(e);
			} finally {
				await closeConn();
			}
		},
		// 专门用于无需开启事物且无中间操作的多条sql的 有序执行
		execute: async (queue, success, failed) => {
			try {
				let results = {};
				let item = null;
				while ((item = queue.shift()) !== undefined) {
					let result = await queryFunction({ queryName: item.name, paras: item.condition }, conn, finalDbName);
					let alias = item.alias || item.name;
					let ret = results[alias];
					if (item.success) {
						item.success(result);
					} else { // 在没有对每个处理都定义 success 的时候，将所有返回值都放到最后统一处理
						if (!ret) {
							results[alias] = result;
						} else {
							if (typeIs(ret, STR_ARRAY)) {
								results[alias] = ret.concat(result);
							} else {
								results[alias] = [ret];
								results[alias].push(result);
							}
						}
					}
				}
				// 因为没有开启事务，所以不用执行提交
				if (success) success(results);
			} catch (e) {
				// 因为没有开启事务，所以不用进行回滚
				jslog.error(e);
				e.code = 500;
				if (failed) failed(e);
			} finally {
				await closeConn();
			}
		}
	};

	// 将指定方法绑定到主对象上
	if (methodQuery) {
		const bwSqlDefs = getSqlDefinitions(finalDbName, configResDir);
		for (let queryName in bwSqlDefs) {
			bwObj[queryName] = async (arg) => {
				await runQueryFunction(queryName, arg);
			};
		}
	}

	return bwObj;
}

bluewater.lambda = require("./query-builder/lambda")(bluewater);

module.exports = bluewater;