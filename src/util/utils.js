const funcsMap = require("./../../res/json/funcs_map.json");

function getFunctionName(name) { 
    return funcsMap[name];
}

/**
 * 1. 数字
 * 2. 大小写字母
 * 3. 下划线、中划线
 */
function chkTagName (name) {
    return /^([0-9a-zA-Z_\-]+)$/.test(name);
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
    chkTagName,
    TypeMap
};