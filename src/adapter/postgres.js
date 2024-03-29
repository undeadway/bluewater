/*
 * postgres 的数据库操作封装
 * 针对 node-postgres（https://github.com/brianc/node-postgres）驱动的适配器
 */

const pg = require("pg");
const connection = require("./../components/connection");

// connect
function connect({ type, url, name, user, passwd, port }) {

	const client = new pg[type]({ // 这里修改为配置的原因是 pg 库支持 client, pool, result 等不同形式
		user     : user,
		host     : url,
		database : name,
		password : passwd,
		port     : port
	});

	return connection(client);
};

const db = require("./../components/base")((paras) => {
	return `$${paras.length}`;
});
db.connect = connect;
db.getDBSize = function () {
	return 0;
};

db.type = {
    Client: "Client",
    Pool: "Pool",
    Result: "Result"
};

db.getDatabaseInfo = function () {

};

module.exports = db;