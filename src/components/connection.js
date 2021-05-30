const statement = require("./statement");

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

module.exports = connection;