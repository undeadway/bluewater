function connection(conn) {

	let isConnected = false;

	function connect () {
		if (isConnected) return;
		conn.connect();
		isConnected = true;
	}

  return {
		/*
		 * tidyUp 这个函数是一个默认的函数
		 * 如果有特殊的需求，数据库独自处理
		 * 如果是 select 切有数据，则返回 [ {} ]，
		 * 如果是 select 切无数据，则返回 []
		 * 【待实现】
		 * 其他请求 （ update 、insert 、 delete ）
		 * 则返回 { success: true / false }
		 * 
		 * 默认不做任何处理
		 */
		tidyUp: (obj) => {
			return obj;
		},
		begin: async () => {
			connect();
			await conn.query("BEGIN");
		},
		commit: async () => {
			await conn.query("COMMIT");
		},
		rollback: async () => {
			await conn.query("ROLLBACK");
		},
		prepare: (sql) => {
			return statement(connect, conn, sql);
		},
		close: () => {
			conn.end();
		}
	}
}

function statement(connect, conn, sql) {

	async function execute(arg) {
		connect();
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
