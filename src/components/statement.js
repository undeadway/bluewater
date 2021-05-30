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

module.exports = statement;