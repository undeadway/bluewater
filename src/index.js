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
const archive = require("./util/archive"); // 这里主要考虑归档处理可能被中途启动

// 这个函数预读入数据库的配置信息
const [BLUEWATER_DEFS, db, dbConnConfig, useCache, dbName, methodQuery] = (() => {

	const { readFileSync, existsSync } = require("fs");
	const STR_ON = "ON";

	let def = existsSync(process.cwd() + "/res/json/sql.json") ?
				// 这里是读入 bluewater 的所有 sql 配置，或者配置为空
				JSON.parse(readFileSync(process.cwd() + "/res/json/sql.json"), "utf-8")
				: {};

	// 这里是数据库的配置，包括数据库类型、数据库连接、用户名密码等
	// 但 bluewater 不负责实现对这些内容的解析，数据库该怎么连，交给每种数据库独立完成
	let database = JSON.parse(readFileSync(process.cwd() + "/res/json/bluewater.json"), "utf-8");
	let useCache = database["use-cache"] === STR_ON,
		dbConnConfig = database.connection,
		dbName = database["database-name"],
		methodQuery = database["method-query"] === STR_ON;

	// 每个 bluewater 都只有一份 archive 的单例，所以这里不需要进行导出或者其他处理
	// init 之后程序进行自动化的归档处理，如果配置中没有配置 archive 则后续也不会进行自动哦归档处理
	archive.init(database.archive);

	// 数据库驱动入口
	return [def, require("./adapter/" + dbName),
			dbConnConfig, useCache, dbName, methodQuery];
})();

// 数据库中间驱动可以使用的数据方法，即实现 bluewater 接口所需要实现的方法
const OPERTATING_METHODS = ["insert", "delete", "update", "select"
	// TODO bluewater 暂时不支持所定义的 SQL 操作：
	// trigger,
	// procedure,
	// "function"
];

function sqlError(msg) {
	throw new Error(msg || "SQL 错误");
}

async function queryFunction(queryName, paras, method, conn) {

	let __sql, sqlArgs, _method, _timeout = 0;
	
	if (BLUEWATER_DEFS[queryName]) { // 如果 queryName 被定义，则走定义好的 sql
		let { method, sql, timeout, condition } = BLUEWATER_DEFS[queryName];

		__sql = sql;
		_timeout = timtout = timeout || 0;
		_method = String.trim(method.toLowerCase());

		if (!Array.has(OPERTATING_METHODS, _method)) sqlError(`bluewater 暂时不支持 ${_method} 。`);

		sqlArgs = {
			from: paras,
			condition: condition
		};
		
	} else { // 如果 BLUEWATER_DEFS 中没有定义，则认为 传入 的 queryName 是条 sql
		__sql = queryName;
		queryName = `Lamdba ${method}`;
		sqlArgs = paras;
		_method = method;
	}

	let [_sql, sqlPara] = db.compire(__sql, sqlArgs);

	let stmt = conn.prepare(_sql); // 实例化 stmt 并获得执行方法
	
	async function closeStmt() {
		if (stmt) {
			await stmt.close();
			stmt = null;
		}
	}

	try {
		if (!stmt) sqlError("无法建立起目标数据库的连接。 ");
		if (useCache && method === 'select') {
			// 当处理类型为 select 且判断使用 cache 的时候，先从缓存中查找是否有已有已被缓存的对象
			let result = db.getCache(_sql, sqlPara);
			if (result !== null) {
				Coralian.logger.log(`${queryName} data get from cache.`);
				return result;
			}
		} else {
			db.clearCache(); // 非 select 或 不使用 cache 操作的时候，清空缓存
		}

		let stmtMethod = stmt[_method];

		if (!stmtMethod) sqlError(`${dbName} 暂时不支持所定义的 ${_method} 操作： `);

		// 执行数据库
		Coralian.logger.log(`${queryName} start # ${_method}`);
		Coralian.logger.log(_sql);
		Coralian.logger.log("args : " + JSON.stringify(sqlPara));

		let result = await stmtMethod(sqlPara);
		if (method === 'select') {
			result = db.getRecordsList(result);
		}

		if (useCache && method === 'select') { // 把搜索到的结果集放到缓存中
			db.putCache(_sql, sqlPara, result, _timeout);
		}

		return result;
	} finally {
		await closeStmt();
	}
}

/*
 * 主函数
 * 
 * 通过 let db = bluewater(); 来创建 connetion 的实例
 * 外部调用不用知道内部逻辑，也不用连接 statement(默认都是 prepare 级的)
 * 具体的如何实现prepare 则交给各个数据库的驱动自己来实现
 * 在 connetcion 创建之后，只要通过 其实例调用在 sql.json 中定义好的方法就可以了。
 * 
 * 例：
 * let db = bluewater();
 * db.getList({
 *     success : [Function],
 *     fail : [Function],
 *     paras : {}
 * });
 * 
 * success : 数据库执行成功后的回调函数（后处理）
 * fail : 数据库执行失败情况下的处理，如果不提供，bluewater 会有一个默认函数来执行，但默认函数只会将错误记录，而不会去解决错误
 * paras : 执行 该sql 所需要的参数
 */
function bluewater() {

	const conn = db.connect(dbConnConfig);

	async function closeConn() {
		if (conn) {
			await conn.close();
			conn = null;
		}
	}

	async function runQueryFunction(queryName, arg) {
		try {
			let result = await queryFunction(queryName, arg.condition, arg.method, conn);
			arg.success(result);
		} catch (e) {
			Coralian.logger.err(e);
			if (arg.failed) {
				arg.fail();
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
				while ((item = queue.shift()) != undefined) {
					let result = await queryFunction(item.name, item.condition, conn);
					if (item.success) {
						let ret = results[item.name];
						if (!ret) {
							results[item.name] = result;
						} else {
							if (typeIs(ret, 'array')) {
								results[item.name] = ret.concat(result);
							} else {
								results[item.name] = [ret];
								results[item.name].push(result);
							}
						}
						item.success(result);
					}
				}
				await conn.commit();
				if (success) success(results);
			} catch (e) {
				await conn.rollback();
				Coralian.logger.err(e);
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
				while ((item = queue.shift()) != undefined) {
					let result = await queryFunction(item.name, item.condition, conn);
					let ret = results[item.name];
					if (!ret) {
						results[item.name] = result;
					} else {
						if (typeIs(ret, 'array')) {
							results[item.name] = ret.concat(result);
						} else {
							results[item.name] = [ret];
							results[item.name].push(result);
						}
					}
				}
				if (success) success(results);
			} catch (e) {
				Coralian.logger.err(e);
				e.code = 500;
				if (failed) failed(e);
			} finally {
				await closeConn();
			}
		}
	};

	if (methodQuery) {
		for (let queryName in BLUEWATER_DEFS) {

			bwObj[queryName] = async (arg) => {
				await runQueryFunction(queryName, arg);
			};
		}
	}

	return bwObj;
}

bluewater.getDatabaseInfo = db.getDatabaseInfo;
bluewater.getDBSize = db.getDBSize;

bluewater.lambda = require("./lambda")(bluewater);

module.exports = bluewater;