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

let map = new Map(); // 这里要重置，所以不能用 const
const keySet = new Set(["count", "size"]);
/**
 * 
 * @param {*} hash hash
 * @param {*} param 请求条件
 * @param {*} records 返回值
 * @param {*} timeout 过期时间
 */
this.put = function (sql, param, records, timeout) {

	if (keySet.has(sql)) {
		throw new Error(`当前关键词已被占用，请换一个关键词。`);
	}

	let hash = md5(sql);
	let key = md5(JSON.stringify(param));

	let obj = map.get(hash);
	if (!obj) {
		obj = {
			sie: 0, count: 0
		};
		map.set(hash, obj);
	}

	obj[key] = { value: records, count: records.length, timeout: timeout * 1000, created: Date.now() };
	obj.count += records.length;
	obj.size++;
}

this.get = function (sql, param) {

	let hash = md5(sql);
	let key = md5(JSON.stringify(param));

	let obj = map.get(hash);
	if (!obj) return null;

	let records = obj[key];
	if (isTimeout(records)) return null;

	var value = records.value;

	if (!!value) {
		obj.count++;
		records.count++;
		return value;
	} else {
		return null;
	}
}

this.has = function (sql, param) {

	let hash = md5(sql);
	if (typeIs(param, "object")) {
		param = JSON.stringify(param);
	}
	let records = map.get(hash, param);

	return records !== null;
}

this.clear = function () {
	map.clear();
	map = new Map();
}
this.size = function () {
	return map.size;
}

this.remove = function (sql, param) {

	let hash = md5(sql);

	if (!param) {
		return map.remove(hash);
	} else {
		let key = md5(JSON.stringify(param));

		let obj = map.get(hash);
		if (!obj) return null;

		let result = obj[key];
		delete obj[key];
		obj.size--;
		obj.count -= result.count;

		if (result) {
			return result.value;
		} else {
			return null;
		}
	}
}

function isTimeout(obj) {

	// timeout < 0 则认为永久缓存
	if (obj.timeout < 0) return false;
	// timeout 为 0
	if (obj.timeout == 0) return true;
	// 创建到现在已经超过timeoue 的保质期
	return (obj.timeout + obj.created) <= Date.now();
}

/**
 * 归档函数自身不实现什么时候进行归档处理
 * 只对哪些缓存进行归档进行处理
 * 
 * 最热的缓存放在内存中
 * 中等的放在文件
 * 最冷的不做缓存
 * 每次归档的间隔判断交给程序配置
 */
this.archive = () => {

	

};