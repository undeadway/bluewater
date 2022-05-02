/**
 * Lamdba 表达式的方式
 * 现只可用于单表查询
 * 
 * 支持的操作
 * =
 */
const { Mark } = Coralian.constants;
const typeMapping = require("../util/type-mapping");
const { errorCast } = Error;

module.exports = exports = (bluewater) => {
	
	return (tableName) => {

		let wheres = [], havings = [], exts = [], paras = {}; // 辅助条件
		let distincts = null, onHaving = false;

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

		function concat (sql) {
			if (!Array.isEmpty(wheres)) {
				sql.push("WHERE");
				sql = sql.concat(wheres);
			}
			sql = sql.concat(exts);

			if (onHaving) {
				if (!Array.isEmpty(havings)) {
					sql.push("HAVING");
					sql = sql.concat(havings);
				}
			}

			return sql;
		}

		const lambda = {
			// TODO 是否可以临时创建表，还要再考虑
			// create: (columnsObj, callback) => {

			// 	let columns = columnsObj.map(column => {
			// 		let output = column.name;
			// 		switch (type.toLowerCase()) {
			// 			case 'nvarchar':
			// 			case 'varchar':
			// 			case 'char':
			// 			case 'nchar':
			// 			case 'varchar2':
			// 				break;
			// 			case 'integer':
			// 			case 'int':
			// 				break;
			// 		}
			// 		return output;
			// 	});

			// 	let columnsDefine = columns.join();
			// 	let sql = `CREAE TABLE ${tableName} (
			// 		${columnsDefine}
			// 	);`;

			// 	query(sql, "create", callback);
			// },
			// drop: () => {
			// 	let sql = `DROP TABLE IF EXISTS ${tableName};`
			// 	query(sql, "drop");
			// },
			select: (columns, callback) => {

				let columnsName, sql = [];
				if (columns === Mark.ASTERISK) {
					columnsName = columns;
				} else {
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
					columnsName = columns.join();
				}

				sql.push(`SELECT ${columnsName} FROM ${tableName}`);

				sql = concat(sql);
				query(sql.join(" "), "select", callback);
			},
			update: (obj, callback) => {

				let sql = [];
				sql.push(`UPDATE ${tableName} SET `);
				let updates = [];

				for (let key in obj) {
					updates.push(`${key} = #[${key}]`);
				}

				sql.push(updates.join());

				paras = Object.assign(paras, obj);

				sql = concat(sql);
				query(sql.join(" "), "update", callback);
			},
			"delete": (callback) => {

				let sql = [];
				sql.push(`DELETE FROM ${tableName} `);
				sql = concat(sql);

				query(sql.join(" "), "delete", callback);
			},
			insert: (datas, callback) => {

				let sql = [];
				sql.push(`INSERT INTO ${tableName} `);
				let columns = [],
					columnFilled = false;
				let inserts = datas.map(data => {
					let insertData = [];
					for (key in data) {
						let obj = data[key];
						if (!columnFilled) {
							columns.push(key);
						}
						let value = typeMapping.format(obj.value, obj.type);
						insertData.push(value);
					}

					columnFilled = true;

					return "(" + insertData.join() + ")";
				});

				sql.push("(" + columns.join() + ")");
				sql.push("VALUES");
				sql.push(inserts.join());

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
				onHaving = true;
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

				if (!onHaving) {
					wheres.push(`${column} = #[${column}]`);
				} else {
					havings.push(`${column} = #[${column}]`);
				}

				paras[column] = value;

				return lambda;
			},
			notEqual: (column, value) => {

				if (!onHaving) {
					wheres.push(`${column} <> #[${column}]`);
				} else {
					havings.push(`${column} <> #[${column}]`);
				}

				paras[column] = value;

				return lambda;
			},
			overThan: (column, value) => {

				if (!onHaving) {
					wheres.push(`${column} > #[${column}]`);
				} else {
					havings.push(`${column} > #[${column}]`);
				}
				
				paras[column] = value;

				return lambda;
			},
			lessThan: (column, value) => {

				if (!onHaving) {
					wheres.push(`${column} < #[${column}]`);
				} else {
					havings.push(`${column} < #[${column}]`);
				}

				paras[column] = value;

				return lambda;
			},
			between: (column, min, max) => {

				if (!onHaving) {
					wheres.push(`${column} BETWEEN #[${column}Min] AND #[${column}Max]`);
				} else {
					havings.push(`${column} BETWEEN #[${column}Min] AND #[${column}Max]`);
				}

				paras[`${column}Min`] = min;
				paras[`${column}Max`] = max;

				return lambda;
			},
			like: (column, value, format) => {

				format = format || `${column}%`;

				value = format.replace(new RegExp(column, "g"), value);

				if (!onHaving) {
					wheres.push(`${column} LIKE #[${column}]`);
				} else {
					havings.push(`${column} LIKE #[${column}]`);
				}

				paras[column] = value;

				return lambda;
			}
		};

		return lambda;
	};
};