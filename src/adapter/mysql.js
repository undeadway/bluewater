/*
 * mysql 的数据库操作封装
 * 针对 驱动的适配器
 */


const connection = require("./parts/connection");


// connect
function connect() {



	return connection(client);
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