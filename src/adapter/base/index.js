/*
 * 各个数据库驱动适配器的基类工厂
 * 在这个基类的基础上，可以添加属于各个数据库自己独有的特性来供使用
 *
 * 使用方式:
 *   const base = require("./base")((paras) => `$${paras.length}`);
 *   // base 包含: compire, getRecordsList, putCache, getCache, clearCache, removeCache, hasCache
 */

const SelectCache = require("./../../util/select-cache");
const { compile, getRecordsList } = require("./engine");

/**
 * 适配器必须实现的接口契约。
 *
 * 每个数据库适配器（如 mysql.js, postgres.js, sqlite3.js）必须导出
 * 一个包含以下方法的对象：
 *
 * @typedef {Object} DatabaseAdapter
 * @property {Function} connect       - 创建数据库连接，返回 Connection 对象
 * @property {Function} compire       - 编译 SQL 模板为原生 SQL + 参数数组
 * @property {Function} getRecordsList - 将结果集字段从下划线命名转为驼峰命名
 * @property {Function} getDBSize     - 获取数据库文件大小（字节），返回 Number
 * @property {Function} putCache      - 写入查询缓存
 * @property {Function} getCache      - 读取查询缓存
 * @property {Function} clearCache    - 清空所有查询缓存
 * @property {Function} removeCache   - 移除指定查询的缓存
 * @property {Function} hasCache      - 检查是否存在缓存
 *
 * 其中 connect() 返回的 Connection 对象必须包含：
 * @typedef {Object} Connection
 * @property {Function} tidyUp   - 结果后处理函数
 * @property {Function} begin    - 开启事务
 * @property {Function} commit   - 提交事务
 * @property {Function} rollback - 回滚事务
 * @property {Function} prepare  - 预编译 SQL，返回 Statement 对象
 * @property {Function} close    - 关闭连接
 *
 * Statement 对象必须包含：
 * @typedef {Object} Statement
 * @property {Function} select - 执行查询
 * @property {Function} insert - 执行插入
 * @property {Function} update - 执行更新
 * @property {Function} delete - 执行删除
 * @property {Function} close  - 释放语句资源
 */

/**
 * 基类工厂函数
 * @param {Function} getPrepareMark - 返回参数占位符的函数，如 (paras) => `$${paras.length}`
 * @returns {DatabaseAdapter} 适配器对象（不含 connect，需调用方自行添加）
 */
module.exports = (getPrepareMark) => {

	const cache = new SelectCache();
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
			cache.put(obj, para, expire);
		},
		getCache: (sql, para) => {
			return cache.get(sql, para);
		},
		clearCache: () => {
			cache.clear();
		},
		removeCache: (obj, para) => {
			cache.remove(obj, para);
		},
		hasCache: (obj, para) => {
			cache.has(obj, para);
		}
	};
};
