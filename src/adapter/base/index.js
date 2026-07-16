/*
 * 各个数据库驱动适配器的基类工厂
 * 在这个基类的基础上，可以添加属于各个数据库自己独有的特性来供使用
 *
 * 使用方式:
 *   const base = require("./base")((paras) => `$${paras.length}`);
 *   // base 包含: compire, getRecordsList, putCache, getCache, clearCache, removeCache, hasCache
 */

const selectCache = require("./../../util/select-cache");
const { compile, getRecordsList } = require("./engine");

module.exports = (getPrepareMark) => {

	const engine = {
		compire: (input, sqlArgs) => {
			return compile(input, sqlArgs, getPrepareMark);
		},
		getRecordsList
	};

	return {
		compire: engine.compire,
		getRecordsList: engine.getRecordsList,
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
		hasCache: (obj, para) => {
			selectCache.has(obj, para);
		}
	};
};
