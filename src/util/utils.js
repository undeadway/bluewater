const funcsMap = require("./../../res/json/funcs_map.json");

function getFunctionName(name) { 
    return funcsMap[name];
}

TypeMap = {
    check: () => {

    },
    format : (input, type) => {
        // TODO 暂时先把所有字符串加上引号，其他类型之后再处理
        switch (type) {
            case "nchar":
            case "varchar":
            case "nvarchar":
            case "char":
                return `'${input}'`;
            default :
        }
        return input;
    }
};

module.exports = {
    getFunctionName,
    TypeMap
};