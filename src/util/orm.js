
exports.insert = (obj) => {
	let tbName = obj.table;
	let entity = obj.entity;

	let columns = [];
	let values = []

	entity.map(item => {
		columns.push(item.column);
		values.push(`'${item.value}'`);
	});

	let sql = "INSERT INTO (" + columns.join() + ") VALUES (" + values.join() + ")";
};

exports["delete"] = (obj) => {
	let tbName = obj.table;
	let pk = obj.pk;

	let sql = `delete from ${tbName} where `;
	Object.forEach(pk, (k, v) => {
		sql += `${k} = ''${v} '`;
	});
}