/*
 * SQLite 的数据库操作封装
 * 针对 node-sqlite3（https://github.com/mapbox/node-sqlite3）驱动的适配器
 *
 * sqlite3 的 API 是回调风格的（conn.prepare → stmt.run/stmt.all），
 * 与 pg/mysql2 的 conn.query 模式不同，因此 connection 需要单独实现。
 * 但 engine（SQL编译）和 cache 仍通过 base/index.js 工厂复用。
 */
const Database = require("sqlite3").verbose().Database;
const fs = require("fs");

const BEGIN_TPL = "BEGIN {level} TRANSACTION;";
const COMMIT_SQL = "COMMIT;";
const ROLLBACK_SQL = "ROLLBACK;";
const DEFAULT_LEVEL = "IMMEDIATE";

// 用于 getDBSize 的缓存（最近一次连接的数据库文件路径）
let lastDbUrl = null;

/**
 * 将 sqlite3 的回调 API 封装为与 base/connection.js 一致的接口
 */
function connect({ url }) {

	lastDbUrl = url;
	const db = new Database(url);

	return {
		tidyUp: (obj) => obj,

		begin: () => new Promise((resolve, reject) => {
			db.run(BEGIN_TPL.replace("{level}", DEFAULT_LEVEL), (err) => {
				if (err) reject(err); else resolve();
			});
		}),

		commit: () => new Promise((resolve, reject) => {
			db.run(COMMIT_SQL, (err) => {
				if (err) reject(err); else resolve();
			});
		}),

		rollback: () => new Promise((resolve, reject) => {
			db.run(ROLLBACK_SQL, (err) => {
				if (err) reject(err); else resolve();
			});
		}),

		prepare: (sql) => statement(db, sql),

		close: () => new Promise((resolve) => {
			db.close();
			resolve();
		})
	};
}

/**
 * SQLite3 的 PreparedStatement 封装
 * sqlite3 使用 db.prepare(sql) → stmt.all(args, cb) / stmt.run(args, cb) 模式
 */
function statement(db, sql) {

	function runStmt(method, arg) {
		return new Promise((resolve, reject) => {
			const stmt = db.prepare(sql);
			stmt[method](arg, (err, result) => {
				if (err) return reject(err);
				stmt.finalize();
				resolve(result);
			});
		});
	}

	return {
		select: (arg) => runStmt("all", arg),
		insert: (arg) => runStmt("run", arg),
		"delete": (arg) => runStmt("run", arg),
		update: (arg) => runStmt("run", arg),
		close: () => {}
	};
}

function prepareMark() {
	return "?";
}

// 通过 base 工厂获得 engine（SQL 编译）和 cache 能力
const db = require("./base")(prepareMark);
db.connect = connect;
db.getDBSize = function () {
	if (!lastDbUrl) return 0;
	try {
		return fs.statSync(lastDbUrl).size;
	} catch (_) {
		return 0;
	}
};

module.exports = new Proxy(db, {
	get: (target, prop) => target[prop]
});
