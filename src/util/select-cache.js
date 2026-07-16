/*
 * 数据库缓存
 * 缓存采用两重缓存形式
 * 1. 先缓存 sql，
 * 2. 再分 sql 缓存 条件（序列化后）
 * 
 * 通过 size（项目数量）、count（访问次数） 来判断热门程度，以决定是否需要缓存
 * 以及用何种方式进行缓存
 * 
 * 逻辑：
 * 理论上如果所有数据的访问一致，则 项目缓存访问次数 / 全局缓存访问次数 = 1 / 项目数量
 * 但实际上所有访问并不可能都一致，甚至接近，所以
 * 项目缓存访问次数 / 全局缓存访问次数 > 1 / 项目数量 表示访问数量多，较为热门
 * 项目缓存访问次数 / 全局缓存访问次数 < 1 / 项目数量 表示访问数量少，较为冷门
 * 
 * 根据以上逻辑，设立两个阈值点：[3 / 项目数量, 0.1 / 项目数量]
 * 项目缓存访问次数 / 全局缓存访问次数 > 3 / 项目数量 时，则全部计入内存缓存
 * 项目缓存访问次数 / 全局缓存访问次数 < 0.1 / 项目数量，则不缓存
 * 中间则全部使用文件缓存
 */
const md5 = require("md5");

const KEY_SET = new Set(["count", "size"]);

class SelectCache {

	constructor() {
		this.map = new Map();
	}

	/**
	 * @param {string} sql SQL 语句
	 * @param {*} param 请求条件
	 * @param {*} records 返回值
	 * @param {number} timeout 过期时间（秒）
	 */
	put(sql, param, records, timeout) {
		if (KEY_SET.has(sql)) {
			throw new Error(`当前关键词已被占用，请换一个关键词。`);
		}

		const hash = md5(sql);
		const key = md5(JSON.stringify(param));

		let obj = this.map.get(hash);
		if (!obj) {
			obj = { size: 0, count: 0 };
			this.map.set(hash, obj);
		}

		obj[key] = { value: records, count: records.length, timeout: timeout * 1000, created: Date.now() };
		obj.count += records.length;
		obj.size++;
	}

	get(sql, param) {
		const hash = md5(sql);
		const key = md5(JSON.stringify(param));

		const obj = this.map.get(hash);
		if (!obj) return null;

		const records = obj[key];
		if (this._isTimeout(records)) return null;

		if (records && records.value) {
			obj.count++;
			records.count++;
			return records.value;
		}
		return null;
	}

	has(sql, param) {
		const hash = md5(sql);
		if (typeof param === "object" && param !== null && !Array.isArray(param)) {
			param = JSON.stringify(param);
		}
		const obj = this.map.get(hash);
		if (!obj) return false;

		const key = typeof param === "object" ? md5(JSON.stringify(param)) : param;
		return obj[key] !== undefined;
	}

	clear() {
		this.map.clear();
		this.map = new Map();
	}

	size() {
		return this.map.size;
	}

	remove(sql, param) {
		const hash = md5(sql);

		if (param === undefined || param === null) {
			const result = this.map.get(hash);
			this.map.delete(hash);
			return result || null;
		}

		const key = md5(JSON.stringify(param));
		const obj = this.map.get(hash);
		if (!obj) return null;

		const result = obj[key];
		delete obj[key];
		obj.size--;
		if (result) {
			obj.count -= result.count;
			return result.value;
		}
		return null;
	}

	_isTimeout(obj) {
		if (!obj) return true;
		// timeout < 0 则认为永久缓存
		if (obj.timeout < 0) return false;
		// timeout 为 0 则立即过期
		if (obj.timeout === 0) return true;
		// 创建到现在已经超过 timeout 的保质期
		return (obj.timeout + obj.created) <= Date.now();
	}
}

module.exports = SelectCache;