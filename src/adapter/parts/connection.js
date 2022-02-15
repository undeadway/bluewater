function connection(conn) {

    return {
		begin: async () => {
			conn.connect();
			await conn.query("BEGIN");
		},
		commit: async () => {
			await conn.query("COMMIT");
		},
		rollback: async () => {
			await conn.query("ROLLBACK");
		},
		prepare: (sql) => {
			return statement(conn, sql);
		},
		close: () => {
			conn.end();
		}
	}
}

function statement(conn, sql) {

	async function execute(arg) {
		conn.connect();
		return await conn.query(sql, arg);
	}

	return {
		select: execute,
		insert: execute,
		update: execute,
		delete: execute,
		close: Function.EMPTY_BODY
	}
}


module.exports = connection;