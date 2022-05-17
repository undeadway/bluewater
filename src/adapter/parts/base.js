/*
 * 各个数据库驱动适配器的基类
 * 在这个类的基础上，可以添加属于各个数据库自己独有的特性来供使用
 */

const selectCache = require("./../../util/select-cache");
const { getFunctionName, chkTagName } = require("./../../util/utils");
const isArray = Array.isArray;
const firstToUpperCase = Coralian.util.StringUtil.firstToUpperCase;
const UNDERBAR = "_";

// const BW_TAG_PARAS_START = "#[", BW_TAG_CDTION_START = "?[", BW_TAG_LIKE_START = "![",
// 	BW_FUNCTION_START = "&[", BW_TAG_END = "]";

// bluewater 对象区分符号常量
const BW_TAG_CDTION_START = "?[", BW_TAG_END = "]";
const BW_TAG_REGX = /#\[(.+)\]/, BW_LIKE_REGX = /!\[(.+)\]/, BW_FUNCTION_REGX = /&\[(.+)\]/;

function sqlError(msg) {
	throw new Error(msg);
}

module.exports = (getPrepareMark) => {

	/*
	 * bluewater 支持 SELECT * FROM TABLE WHERE ID = #[id] 这种形式的 SQL。
	 * 但 #[] 这种语法数据库是不支持的，
	 * 所以这个函数就是将上面那种形式的SQL 编译为数据库所支持的形式
	 * 
	 * @param sql 待修改的 SQL
	 * @param paras 参数集合
	 * @returns
	 */
	function compireObjectToArrray(sql, paras) {

		if (!paras) return [sql];
		if (Array.isArray(paras)) {
			return [sql, paras];
		}

		// while(String.contains(sql, BW_FUNCTION_START)) {
		while (BW_FUNCTION_REGX.test(sql)) {

			let regx = sql.match(BW_FUNCTION_REGX);
			let tagName = regx[0], name = regx[1]; // TODO 因为还么想好 name 的控制是什么，所以暂时就不做内容限制

			chkTagName(name);
			let value = getFunctionName(name) + paras[name];
	
			sql = sql.replace(tagName, value);
		}

		let para = [];
		// while (String.contains(sql, BW_TAG_PARAS_START)) { // 1 通过遍历 sql 来获得 所有变量名
		while (BW_TAG_REGX.test(sql)) {
			// let start = sql.indexOf(BW_TAG_PARAS_START) + 2,
			// 	end = sql.indexOf(BW_TAG_END);
			// let name = sql.slice(start, end);

			// 2 将变量装配到数组中
			let regx = sql.match(BW_TAG_REGX);
			let tagName = regx[0], name = regx[1];

			chkTagName(name);
			let value = paras[name];

			// 3 修改 sql
			if (typeIs(value, "array")) {
				let append = `, ${tagName}`;
				for (let i = 0, len = value.length - 1; i < len; i++) {
					let val = value[i];
					sql = pushSqlValue(para, val, sql, tagName, append);
				}
				sql = pushSqlValue(para, Array.last(value), sql, tagName);
			} else {
				if (value === undefined || value === null) {
					sqlError("SQL 参数 " + name + " 为 " + value);
				}
				sql = pushSqlValue(para, value, sql, tagName);
			}
		}

		// while(String.contains(sql, BW_TAG_LIKE_START)) {
		// 	let start = sql.indexOf(BW_TAG_LIKE_START) + 2,
		// 	end = sql.indexOf(BW_TAG_END);
		// 	let name = sql.slice(start, end);

		while (BW_LIKE_REGX.test(sql)) {

			let regx = sql.match(BW_LIKE_REGX);
			let tagName = regx[0], name = regx[1];  // name 包括 % 在内的所有标签内容
			let realName = name.replace(/%/g, ""); // 去 %

			chkTagName(realName);
			let value = paras[realName];

			paras[realName] = value = name.replace(realName, value);

			if (value === undefined || value === null) {
				sqlError("SQL 参数 " + name + " 为 " + value);
			}
			sql = pushSqlValue(para, value, sql, tagName);
		}

		return [sql, para]; // 4 返回 SQL
	}

	function pushSqlValue(para, value, sql, tagName, append = String.BLANK) {

		para.push(value);
		// 3 修改 sql
		sql = sql.replace(tagName, getPrepareMark(para) + append);

		return sql;
	}

	function inputReplace(input, paras, key, argKey, value) {

		let condition = paras[key];
		if (!!condition && condition()) { // 当有这个判断函数以及这个判断函数的返回值为真
			input = input.replace(BW_TAG_CDTION_START + argKey + BW_TAG_END, value);
		} else {
			input = input.replace(BW_TAG_CDTION_START + argKey + BW_TAG_END, String.BLANK);
		}
		return input;
	}

	function getRerord(records) {
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

	return {
		compire: (input, sqlArgs) => {
			let paras = sqlArgs.from;
			if (paras) {
				let conditions = sqlArgs.condition;
				if (conditions) { // 这里预处理 sql 定义中的各种条件判断
					Object.forEach(conditions, (key, value) => {
						switch (typeOf(value)) {
							case "string":
								input = inputReplace(input, paras, key, key, value);
								break;
							case "array":
							case "object":
								/*
								 * 参数主要用在 INSERT 语句中，某些字段是可以为 null 的时候，如：
								 * INSER INTO TABLE(PK_COLUMN ?[hasColumn(name)]) VALUES(123 ?[hasColumn(value)])
								 * 这样在 sql 的 condition 配置中只要写
								 * "hasColumn" ： {
								 *     "name"  : ", COLUMN_NAME",
								 *     "value" : ", #[column]"
								 * }
								 * 就可以，而不用分别写 hasColumnName 和 hasColumnValue 两个配置了
								 * 而前端程序的 condition 中也同样只要实现一个 hasColumn 就可以了，更符合逻辑一些
								 */
								Object.forEach(value, function (argKey, argVal) {
									input = inputReplace(input, paras, key, key + "(" + argKey + ")", argVal);
								});
								break;
							default:
						}
					});
				}
				return compireObjectToArrray(input, paras);
			} else {
				return [input, []];
			}
		},
		getRecordsList: (rows) => {

			let rs = [];
			if (rows) {
				if (isArray(rows)) {
					rows.forEach(function (row) {
						rs.push(getRerord(row));
					});
				} else {
					rs.push(getRerord(rows));
				}
			}

			return rs;
		},
		putCache: (obj, para, expire = 0) => {
			selectCache.put(obj, para, expire);
		},
		getCache: (sql, para) => {
			return selectCache.get(sql, para);
		},
		clearCache: () => {
			selectCache.clear();
		},
		removeCache: (obj, para) => {
			selectCache.remove(obj, para);
		},
		hasCache : (obj, para) => {
			selectCache.has(obj, para);
		}
	};
};