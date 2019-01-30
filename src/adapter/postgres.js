/*
 * postgres 的数据库操作封装
 * 针对 node-postgres（https://github.com/brianc/node-postgres）驱动的适配器
 */

const { Client } = require('pg');

// connection
function connection({ url, name, user, passwd, port }) {

	let client = new Client({
		user: user,
		host: url,
		database: name,
		password: passwd,
		port: port
	});

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
			client.end();
		}
	}
};

function statement(client, sql) {

	async function execute(arg) {
		return await client.query(sql, arg);
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
}, () => {
	return new RegExp("$[d]+");
});
db.connect = connection;
db.getDBSize = function () {

};

db.getDatabaseInfo = function () {

};

module.exports = db;