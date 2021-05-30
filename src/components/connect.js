const statement = require("./statement");

function connection(client) {

    return {
		begin: async () => {
			client.connect();
			await client.query("BEGIN");
		},
		commit: async () => {
			await client.query("COMMIT");
		},
		rollback: async () => {
			await client.query("ROLLBACK");
		},
		prepare: (sql) => {
			return statement(client, sql);
		},
		close: () => {
			client.end();
		}
	}

}

module.exports = connection;