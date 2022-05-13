/*
 * postgres 的数据库操作封装
 * 针对 node-postgres（https://github.com/brianc/node-postgres）驱动的适配器
 */

const pg = require("pg");
const connection = require("./parts/connection");

const Client = "Client", Pool = "Pool", Result = "Result";

// connect
function connect({ type = Client, url, name, user, passwd, port, ssl, timeout = {},
	max, idle, maxUses, // pool
	connStr, types, appName // client
	}) {

	const db = new pg[type]({ // 这里修改为配置的原因是 pg 库支持 client, pool, result 等不同形式
		user                                : user,
		host                                : url,
		database                            : name,
		password                            : passwd,
		port                                : port,
        ssl                                 : ssl,
        connectionTimeoutMillis             : timeout.connection,
        max                                 : max,
        idleTimeoutMillis                   : idle,
        maxUses                             : maxUses,
        connectionString                    : connStr,
        types                               : types,
		statement_timeout                   : timeout.statement,
		query_timeout                       : timeout.query,
		application_name                    : appName,
		idle_in_transaction_session_timeout : timeout.idleTransaction
	});

	return connection(db);
};

const db = require("./parts/base")((paras) => {
	return `$${paras.length}`;
});
db.connect = connect;
db.getDBSize = function () {
	return 0;
};

const type = {
    Client, Pool, Result
};

db.type = new Proxy(type, {
	get: (target, prop) => {
		return target[prop];
	}
});

db.getDatabaseInfo = function () {

};

module.exports = new Proxy(db, {
	get: (target, prop) => {
		return target[prop];
	}
});