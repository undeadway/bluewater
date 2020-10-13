/*
 * mysql 的数据库操作封装
 * 针对 mysql（https://github.com/mysqljs/mysql）驱动的适配器
 */

const mysql      = require("mysql");

function connection({ url, name, user, passwd, port }, { charset, timezone }) {
	const connection = mysql.createConnection({
		host     : url,
		user     : user,
		password : passwd,
		database : name,
		port     : port,
		charset  : charset
	});

	return {
		begin: async () => {

		}
	};
}

