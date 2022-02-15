function connection(driver) {

	function run (sql, arg) {
		driver.connect();
		await driver.query(sql, arg);
	}

    return {
		begin: async () => {
			await run("BEGIN");
		},
		commit: async () => {
			await driver.query("COMMIT");
		},
		rollback: async () => {
			await driver.query("ROLLBACK");
		},
		prepare: (sql) => {
			return statement(run, sql);
		},
		close: () => {
			driver.end();
		}
	}
}

function statement(run, sql) {

	async function execute(arg) {
		return run(sql, arg);
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