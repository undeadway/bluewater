/*
 * SQL 编译引擎
 * 负责将 bluewater 自定义标签语法的 SQL 编译为数据库原生 SQL
 *
 * 支持标签:
 *   #[param]    — 参数占位符
 *   ?[condition] — 条件片段替换
 *   ![like]     — LIKE 模糊匹配
 *   &[function] — 函数映射
 */

const { getFunctionName, chkTagName, sqlError } = require("./../../util/utils");
const firstToUpperCase = Coralian.util.StringUtil.firstToUpperCase;
const UNDERBAR = "_";

const BW_TAG_CDTION_START = "?[", BW_TAG_END = "]";
const BW_TAG_REGX = /#\[(.+?)\]/, BW_LIKE_REGX = /!\[(.+?)\]/, BW_FUNCTION_REGX = /&\[(.+?)\]/;

/**
 * 编译带标签的 SQL 为数据库原生 SQL + 参数数组
 * 例如: "WHERE ID = #[id]" → "WHERE ID = $1", [idValue]
 */
function compile(input, sqlArgs, getPrepareMark) {
	let paras = sqlArgs.from;
	if (paras) {
		let conditions = sqlArgs.condition;
		if (conditions) {
			Object.forEach(conditions, (key, value) => {
				switch (typeOf(value)) {
					case "string":
						input = inputReplace(input, paras, key, key, value);
						break;
					case "array":
					case "object":
						Object.forEach(value, function (argKey, argVal) {
							input = inputReplace(input, paras, key, key + "(" + argKey + ")", argVal);
						});
						break;
				}
			});
		}
		return compileObjectToArray(input, paras, getPrepareMark);
	} else {
		return [input, []];
	}
}

function compileObjectToArray(sql, paras, getPrepareMark) {
	if (!paras) return [sql];
	if (Array.isArray(paras)) {
		return [sql, paras];
	}

	// 1. 处理 &[function] 标签 — 函数映射
	while (BW_FUNCTION_REGX.test(sql)) {
		let regx = sql.match(BW_FUNCTION_REGX);
		let tagName = regx[0], name = regx[1];

		chkTagName(name);
		let value = getFunctionName(name) + paras[name];

		sql = sql.replace(tagName, value);
	}

	// 2. 处理 #[param] 标签 — 参数占位符
	let para = [];
	while (BW_TAG_REGX.test(sql)) {
		let regx = sql.match(BW_TAG_REGX);
		let tagName = regx[0], name = regx[1];

		chkTagName(name);
		let value = paras[name];

		if (typeIs(value, "array")) {
			let append = `, ${tagName}`;
			for (let i = 0, len = value.length - 1; i < len; i++) {
				let val = value[i];
				sql = pushSqlValue(para, val, sql, tagName, getPrepareMark, append);
			}
			sql = pushSqlValue(para, Array.last(value), sql, tagName, getPrepareMark);
		} else {
			if (value === undefined || value === null) {
				sqlError("SQL 参数 " + name + " 为 " + value);
			}
			sql = pushSqlValue(para, value, sql, tagName, getPrepareMark);
		}
	}

	// 3. 处理 ![like] 标签 — LIKE 模糊匹配
	while (BW_LIKE_REGX.test(sql)) {
		let regx = sql.match(BW_LIKE_REGX);
		let tagName = regx[0], name = regx[1];
		let realName = name.replace(/%/g, "");

		chkTagName(realName);
		let value = paras[realName];

		paras[realName] = value = name.replace(realName, value);

		if (value === undefined || value === null) {
			sqlError("SQL 参数 " + name + " 为 " + value);
		}
		sql = pushSqlValue(para, value, sql, tagName, getPrepareMark);
	}

	return [sql, para];
}

function pushSqlValue(para, value, sql, tagName, getPrepareMark, append) {
	append = append || String.BLANK;
	para.push(value);
	sql = sql.replace(tagName, getPrepareMark(para) + append);
	return sql;
}

function inputReplace(input, paras, key, argKey, value) {
	let condition = paras[key];
	if (!!condition && condition()) {
		input = input.replace(BW_TAG_CDTION_START + argKey + BW_TAG_END, value);
	} else {
		input = input.replace(BW_TAG_CDTION_START + argKey + BW_TAG_END, String.BLANK);
	}
	return input;
}

/**
 * 将单条记录的下划线命名转换为驼峰命名
 * user_name → userName
 */
function formatRecord(records) {
	let obj = {};
	if (records) {
		Object.forEach(records, function (key, val) {
			key = key.toLowerCase();
			if (String.contains(key, UNDERBAR)) {
				let keyArr = key.split(UNDERBAR);
				let keyRslt = [keyArr[0]];
				for (let i = 1, len = keyArr.length; i < len; i++) {
					keyRslt.push(firstToUpperCase(keyArr[i]));
				}
				key = keyRslt.join(String.BLANK);
			}
			obj[key] = val;
		});
	}
	return obj;
}

/**
 * 将查询结果集统一转换为驼峰命名的对象数组
 */
function getRecordsList(rows) {
	let rs = [];
	if (rows) {
		if (Array.isArray(rows)) {
			rows.forEach(function (row) {
				rs.push(formatRecord(row));
			});
		} else {
			rs.push(formatRecord(rows));
		}
	}
	return rs;
}

module.exports = {
	compile,
	getRecordsList
};
