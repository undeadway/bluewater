/*
 * SQLite 的数据库操作封装
 * 针对 node-sqlite3（https://github.com/mapbox/node-sqlite3）驱动的适配器
 * 
 * 这个类的接口由 bluewater统一，但也可以独立于 bluewater 单独使用
 * 但如果单独使用，在 connection、statement 中所定义好的方法就好比是jdbc接口
 * 
 * 要直接用 getList，就得通过 bluewater 才能实现
 * 而不是直接调用这里的 connection 中定义好的方法来执行了
 */
var Database = require("sqlite3").verbose().Database;
var slice = Array.prototype.slice,
	isArray = Array.isArray;
var FILE_NAME, BEGIN_TRANSACTION = "BEGIN {level} TRANSACTION;",
	ROLLBACK = " ROLLBACK ",
	COMMIT = "COMMIT;",
	DEFAULT_LEVEL = "IMMEDIATE",
	VACUUM = "VACCUM;";
var fs = require("fs");

// connection
function connection({ url }) {

	FILE_NAME = url;
	var conn = new Database(url);

	function close() {
		if (!conn) {
			return new Promise((resolve, reject) => {
				conn.finalize();
				conn = null;
				resolve();
			});
		}
	}

	return {
		close: close,
		begin: () => {
			return new Promise((resolve, reject) => {
				conn.run(getTransaction(), (err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				});
			});
		},
		commit: () => {
			return new Promise((resolve, reject) => {
				conn.run(COMMIT, (err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				});
			});
		},
		rollback: () => {
			return new Promise((resolve, reject) => {
				conn.run(getRollback(), (err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				});
			});
		},
		prepare: (sql) => {
			return statement(conn, sql);
		}
	};
}

// statement
function statement(conn, sql) {

	let stmt = null;

	function close() {
		if (stmt !== null) {
			return new Promise((resolve, reject) => {
				stmt.finalize();
				stmt = null;
				resolve();
			});
		}
	}

	function update(arg) {
		stmt = conn.prepare(sql);
		return new Promise((resolve, reject) => {
			stmt.run(arg, (err, ret) => {
				if (err) {
					reject(err);
				} else {
					resolve(ret);
				}
			});
		});
	}

	return {
		select: (arg) => {
			stmt = conn.prepare(sql);
			return new Promise((resolve, reject) => {
				stmt.all(arg, (err, rows) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				});
			});
		},
		insert: update,
		'delete': update,
		update: update,
		close: close
	}
}

function getTransaction(level) {

	level = level || DEFAULT_LEVEL;
	return BEGIN_TRANSACTION.replace("{level}", level);
}

function getRollback(savePoint) {

	var rollBack = ROLLBACK;
	if (savePoint) {
		rollBack += savePoint;
	}
	rollBack += ';';

	return rollBack;
}

function prepareMark() {
	return "?";
}

let db = require("./base")(prepareMark, prepareMark);
db.connect = connection;
db.getDBSize = function () {

	var stat = fs.statSync(FILE_NAME);

	return stat.size;
};

db.getDatabaseInfo = function () {

};

module.exports = db;
