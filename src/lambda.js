/**
 * Lamdba 表达式的方式
 * 只可用于单表查询
 */

const { errorCast } = Error;

module.exports = exports = (bluewater) => {
	
	return (tableName) => {

		const db = bluewater();

		let wheres = [], exts = [], paras = {}; // 辅助条件
		let distincts = null, isHaving = false;

		function query(sql, method, callback) {
			db.query({
				name: sql,
				condition: {
					from: paras
				},
				success: callback,
				method: method
			});
		}

		let lambda = {
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

				sql.push(`UPDATE ${tableName} SET `);
				obj.map(o => {
					sql.push();
				});

			},
			"delete": (callback) => {

				sql.push(`DELETE FROM ${tableName} `);

			},
			insert: (callback) => {

				sql.push(`INSERT INTO ${tableName} `);
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
			havging: () => {
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
			notEqual: () => {

			},
			overthan: (column, value) => {

				wheres.push(`${column} > #[${column}]`);
				paras[column] = value;

				return lambda;
			},
			lessthan: (column, value) => {

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