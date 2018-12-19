/*
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
 */
let BLUEWATER_DEFS, dbConnConfig, useCache, dbType;

// 这个函数预读入数据库的配置信息
let db = (function (readFileSync) {

	// 这里是读入 bluewater 的所有 sql 配置
	BLUEWATER_DEFS = JSON.parse(readFileSync(process.cwd() + "/res/json/sql.json"), "utf-8");
	// 这里是数据库的配置，包括数据库类型、数据库连接、用户名密码等
	// 但 bluewater 不负责实现对这些内容的解析，数据库该怎么连，交给每种数据库独立完成
	let database = JSON.parse(readFileSync(process.cwd() + "/res/json/bluewater.json"), "utf-8");
	useCache = database.cache;
	dbConnConfig = database.connection;
	dbType = database.type;

	// 数据库驱动入口
	return require("./adapter/" + dbType);
})(require("fs").readFileSync);

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

let selectCache = require("./util/select_cache");

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

	let conn = db.connect(dbConnConfig);

	async function closeConn() {
		if (conn) {
			await conn.close();
			conn = null;
		}
	}

	let bwObj = {}, instance = {};

	/*
	 * 现在所有 sql 都定义在一个大对象下， sql 不多的时候可以这么搞，
	 * 今后sql多了以后，要考虑将这些 sql 拆成多个子对象（命名空间概念）分别加载
	 * 类似 mybatis 的分 xml 文件 或者分 类来加载 sql
	 */
	Object.forEach(BLUEWATER_DEFS, (queryName, { method, sql, timeout, condition }) => {

		method = String.trim(method.toLowerCase());
		timeout = timeout || 0;

		instance[queryName] = async (paras) => {

			if (!Array.has(OPERTATING_METHODS, method)) sqlError(`bluewater 暂时不支持${method}。`);

			let sqlArgs = {
				from: paras,
				condition: condition
			};

			let [_sql, sqlPara] = db.compire(sql, sqlArgs);
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
					let result = selectCache.get(_sql, sqlPara);
					if (result !== null) {
						Coralian.logger.log(queryName + " data get from cache.");
						return result;
					}
				} else {
					selectCache.clear(); // 非 select 或 不使用 cache 操作的时候，清空缓存
				}

				let stmtMethod = stmt[method];

				if (!stmtMethod) sqlError(`${dbType} 暂时不支持所定义的 ${method} 操作： `);

				// 执行数据库
				Coralian.logger.log(queryName + " start # " + method);
				Coralian.logger.log(_sql);
				Coralian.logger.log("args : " + JSON.stringify(sqlPara));

				let result = await stmtMethod(sqlPara);
				if (method === 'select') {
					result = db.getRecordsList(result);
				}

				if (useCache && method === 'select') { // 把搜索到的结果集放到缓存中
					selectCache.put(_sql, sqlPara, result, timeout);
				}

				return result;
			} finally {
				await closeStmt();
			}
		}

		bwObj[queryName] = async (arg) => {

			try {
				let result = await instance[queryName](arg.condition);
				arg.success(result);
			} finally {
				await closeConn();
			}
		};

		bwObj.transaction = async (queue, fail) => { // 专门用于事务（多条sql有顺序执行）
			try {
				await conn.begin();
				for (let item of queue) {
					let result = await instance[item.name](item.condition);
					if (item.success) {
						item.success(result);
					}
				}
				await conn.commit();
			} catch (e) {
				await conn.rollback();
				Coralian.logger.err(err.message);
				Coralian.logger.err("bluewater err:\n" + err.stack);
				e.code = 500;
				fail(e);
			} finally {
				await closeConn();
			}
		};


		bwObj.execute = async (queue, success, fail) => { // 专门用于没有更新操作的多条sql有顺序执行
			try {
				let result = {};
				for (let item of queue) {
					result[item.name] = await instance[item.name](item.condition);
				}
				success(result);
			} catch (e) {
				Coralian.logger.err(err.message);
				Coralian.logger.err("bluewater err:\n" + err.stack);
				e.code = 500;
				fail(e);
			} finally {
				await closeConn();
			}
		};
	});

	return bwObj;
}

bluewater.getDatabaseInfo = db.getDatabaseInfo;
bluewater.getDBSize = db.getDBSize;

module.exports = bluewater;