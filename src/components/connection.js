function connection(driver) {

    return {
		begin: async () => {
			driver.connect();
			await driver.query("BEGIN");
		},
		commit: async () => {
			await driver.query("COMMIT");
		},
		rollback: async () => {
			await driver.query("ROLLBACK");
		},
		prepare: (sql) => {
			return statement(driver, sql);
		},
		close: () => {
			driver.end();
		}
	}
}

function statement(client, sql) {

	async function execute(arg) {
		return await client.query(sql, arg);
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