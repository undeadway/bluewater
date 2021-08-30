
module.exports = {
	check: () => {

	},
	format : (input, type) => {
		// TODO 暂时先把所有字符串加上引号，其他类型之后再处理
		switch (type) {
			case 'nchar':
			case 'varchar':
			case 'nvarchar':
			case 'char':
				return `'${input}'`;
		}
		return input;
	}
};