/**
 * mysql 的数据库操作封装
 * 针对 https://github.com/mysqljs/mysql 驱动的适配器
 */
const mysql = require("mysql");
const connection = require("./../components/connection");

function connect ({ type = "Connection", url, name, user, passwd }) {

	const client = mysql[`create${type}`]({
		host	 : url,
		user	 : user,
		password : passwd,
		database : name
	});

	return connection(client);
}

const db = require("./../components/base")((str) => str);

db.connect = connect;
db.getDBSize = function () {
	return 0;
};

db.type = {
	Pool: "Pool"
}

db.getDatabaseInfo = function () {

};

module.exports = db;