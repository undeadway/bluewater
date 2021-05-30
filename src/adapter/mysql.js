/**
 * mysql 的数据库操作封装
 * 针对 https://github.com/mysqljs/mysql 驱动的适配器
 */
const mysql = require("mysql");
const connect = require("./../components/connect");

function connection ({ type = "Connection", url, name, user, passwd }) {

	const client = mysql[`create${type}`]({
		host	 : url,
		user	 : user,
		password : passwd,
		database : name
	});

	return connect(client);
}

const db = require("./../components/base")((str) => str);

db.connect = connection;
db.getDBSize = function () {
	return 0;
};

db.type = {
	Pool: "Pool"
}

db.getDatabaseInfo = function () {

};

module.exports = db;