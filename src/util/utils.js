const funcsMap = require("./../../res/json/funcs_map.json");

/**
 * Bluewater 错误基类
 */
class BwError extends Error {
	constructor(msg) {
		super(msg);
		this.name = "BwError";
	}
}

/**
 * SQL 语法/定义错误
 */
class BwSqlError extends BwError {
	constructor(msg) {
		super(msg);
		this.name = "BwSqlError";
	}
}

/**
 * 参数错误
 */
class BwParamError extends BwError {
	constructor(msg) {
		super(msg);
		this.name = "BwParamError";
	}
}

/**
 * 数据库连接错误
 */
class BwConnectionError extends BwError {
	constructor(msg) {
		super(msg);
		this.name = "BwConnectionError";
	}
}

function getFunctionName(name) { 
	return funcsMap[name];
}

function sqlError(msg) {
	throw new BwSqlError(msg);
}

/**
 * 1. 数字
 * 2. 大小写字母
 * 3. 下划线、中划线
 */
function chkTagName (name) {
	if (!/^([0-9a-zA-Z_\-]+)$/.test(name)) {
		sqlError(`无法解析 ${name}`);
	}
}

TypeMap = {
	format: (input, type) => {
		// TODO 暂时先把所有字符串加上引号，其他类型之后再处理
		switch (type) {
			case "nchar":
			case "varchar":
			case "nvarchar":
			case "char":
				return `'${input}'`;
			default :
		}
		return input;
	}
};

module.exports = {
	getFunctionName,
	chkTagName,
	sqlError,
	TypeMap,
	BwError,
	BwSqlError,
	BwParamError,
	BwConnectionError
};