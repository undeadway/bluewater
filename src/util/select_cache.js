/*
 * 数据库缓存
 */
var map = new Map();

this.put = function(sql, param, obj, timeout) {

	if(timeout === 0) return; // 如果缓存时间为0则不添加到缓存

	map.set(createKey(sql, param), { value: obj, count: 0, timeout: timeout * 60 * 1000, created: Date.now() });
}

this.get = function(sql, param) {

	var result = map.get(createKey(sql, param));

	if(!result) return null;
	if(isTimeout(result)) return null;

	var value = result.value;

	if(!!value) {
		result.count++; // TODO 这里是用来判断热门程度的，暂时没啥用
		return value;
	} else {
		return null;
	}
}

this.has = function(sql, param) {

	var result = map.has(createKey(sql, param));
	if(result === null || result === undefined) return false;
	if(isTimeout(result)) return false;

	return true;
}


this.clear = function() {
	return map.clear();
}
this.size = function() {
	return map.size;
}

this.remove = function(sql, param) {

	return map.remove(createKey(sql, param));
}

function createKey(sql, param) {

	if(!param || param.length === 0) return sql;

	paras = param.slice();

	while(String.contains(sql, "?")) {
		if(paras.length === 0) throw new Error(sql);
		sql = sql.replace("?", paras.shift());
	}
	if(paras.length !== 0) throw new Error(paras);

	return sql;
}

function saveToFile() {

}

function readFromFile() {

}

function key(sql, param) {

	return {
		getSql: function() {
			return sql;
		},
		getParameters: function() {
			return param.clone();
		},
		equals: function(another) {

			return(sql === another.getSql() && Object.equals(param, another.getParameters()));
		}
	}
}

function isTimeout(obj) {

	// timeout 为 0
	if(obj.timeout === 0) return true;
	// 创建到现在已经超过timeoue 的保质期
	if(obj.timeout + obj.created < Date.now()) return true;

	return false;
}