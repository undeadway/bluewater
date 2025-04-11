/*
 * mysql 的数据库操作封装
 * 针对 mysql2（https://github.com/sidorares/node-mysql2）驱动的适配器
 */
const mysql = require("mysql2");
const connection = require("./parts/connection");

// connect
function connect({url, user, name}) {

	const conn = mysql.createConnection({
		host			: url,
		user			: user,
		database	: name,
		password	: passwd
	});

	return connection(conn);
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