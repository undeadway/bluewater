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

function statement(driver, sql) {

	async function execute(arg) {
		return await driver.query(sql, arg);
	}

	return {
		select: execute,
		insert: execute,
		update: execute,
		delete: execute,
		procedure: execute, // TODO 这种写法对不对不知道，待测试
		close: Function.EMPTY_BODY
	}
}


module.exports = connection;