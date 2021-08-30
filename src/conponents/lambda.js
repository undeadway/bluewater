/**
 * Lamdba 表达式的方式
 * 现只可用于单表查询
 * 
 * 支持的操作
 * =
 */

const { errorCast } = Error;

module.exports = exports = (bluewater) => {
	
	return (tableName) => {

		let wheres = [], exts = [], paras = {}; // 辅助条件
		let distincts = null, isHaving = false;

		function query(sql, method, callback) {

			const db = bluewater();

			db.query({
				name: sql,
				condition: {
					from: paras
				},
				success: callback,
				method: method
			});
		}

		const lambda = {
			create: (columnsObj, callback) => {

				let columns = columnsObj.map(column => {
					let output = column.name;
					switch (type.toLowerCase()) {
						case 'nvarchar':
						case 'varchar':
						case 'char':
						case 'nchar':
						case 'varchar2':
							break;
						case 'integer':
						case 'int':
							break;
					}
					return output;
				});

				let columnsDefine = columns.join();
				let sql = `CREAE TABLE ${tableName} (
					${columnsDefine}
				);`;

				query(sql, "create", callback);
			},
			drop: () => {
				let sql = `DROP TABLE IF EXISTS ${tableName};`
				query(sql, "drop");
			},
			select: (columns, callback) => {

				if (!Array.isArray(columns)) errorCast(columns, Array);

				if (distincts) {
					columns = columns.map((column) => {
						if (distincts.has(column)) {
							return `DISTINCT ${column}`;
						} else {
							return column;
						}
					});
				}

				let columnsName = columns.join();
				let sql = [];

				sql.push(`SELECT ${columnsName} FROM ${tableName}`);
				sql.push(isHaving? "HAVING" : "WHERE");
				sql = sql.concat(wheres);
				sql = sql.concat(exts);

				query(sql.join(" "), "select", callback);
			},
			update: (obj, callback) => {

				let sql = [];
				sql.push(`UPDATE ${tableName} SET `);

				for (let key in obj) {
					sql.push(`${key} = #[${key}]`);
				}

				paras = obj;

				query(sql.join(" "), "update", callback);
			},
			"delete": (callback) => {

				let sql = [];
				sql.push(`DELETE FROM ${tableName} `);

				query(sql.join(" "), "delete", callback);
			},
			insert: (callback) => {

				let sql = [];
				sql.push(`INSERT INTO ${tableName} `);

				query(sql.join(" "), "insert", callback);
			},
			limit: (from, cnt) => {

				exts.push(`LIMIT #[limitFrom] `);
				paras.limitFrom = from;

				if (cnt) {
					exts.push(`LIMIT #[limitTo] `);
					paras.limitTo = cnt;
				}

				return lambda;
			},
			offset: (count) => {

				exts.push(`OFFSET #[offset] `);
				paras.offset = count;

				return lambda;
			},
			having: () => {
				isHaving = true;
			},
			groupBy: (column) => {

				exts.push(`GROUP BY ${column} `);

				return lambda;
			},
			orderBy: (column) => {
				exts.push(`ORDER BY ${column} `);
				return lambda;
			},
			distinct: (columns) => {

				distincts = new Set(columns);

				return lambda;
			},
			equal: (column, value) => {

				wheres.push(`${column} = #[${column}]`);
				paras[column] = value;

				return lambda;
			},
			notEqual: (column, value) => {

				wheres.push(`${column} <> #[${column}]`);
				paras[column] = value;

				return lambda;
			},
			overThan: (column, value) => {

				wheres.push(`${column} > #[${column}]`);
				paras[column] = value;

				return lambda;
			},
			lessThan: (column, value) => {

				wheres.push(`${column} < #[${column}]`);
				paras[column] = value;

				return lambda;
			},
			between: (column, min, max) => {

				wheres.push(`${column} BETWEEN #[${column}Min] AND #[${column}Max]`);
				paras[`${column}Min`] = min;
				paras[`${column}Max`] = max;

				return lambda;
			},
			like: (column, value, format) => {

				format = format || `${column}%`;

				value = format.replace(new RegExp(column, "g"), value);

				wheres.push(`${column} LIKE #[${column}]`);
				paras[column] = value;

				return lambda;
			}
		};

		return lambda;
	};
};