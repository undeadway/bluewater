/*
 * postgres 的数据库操作封装
 * 针对 node-postgres（https://github.com/brianc/node-postgres）驱动的适配器
 */

const { Client } = require('pg');

// connection
function connection({url, name, user, passwd, port}) {

	let client = new Client({
		user: user,
		host: url,
		database: name,
		password: passwd,
		port: port
	});
	client.connect();

	return {
		begin: async () => {
			client.connect();
			await client.query('BEGIN');
		},
		commit: async () => {
			await client.query('COMMIT');
		},
		rollback: async () => {
			await client.query('ROLLBACK');
		},
		prepare: (sql) => {
			return statement(client, sql);
		},
		close: () => {
			client.release();
		}
	}
};

function statement(client, sql) {

	function execute(arg) {
		return new Promise((resolve, reject) => {
			client.query(sql, arg, (err, ret) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(ret.rows);
			})
		});
	}

	return {
		select: execute,
		insert: execute,
		update: execute,
		delete: execute,
		close: Function.EMPTY_BODY
	}
}

let db = require("./base")((paras) => {
	return `$${paras.length}`;
});
db.connect = connection;
db.getDBSize = function () {

};

db.getDatabaseInfo = function () {

};

module.exports = db;