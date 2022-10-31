/**
 * 归档模块
 * 
 * 归档是将混存暂存到文件中
 * 方便后续查取，而不用频繁读取数据库
 * 
 * 归档模块通过从配置中读取归档的路径、归档类型、归档间隔时间、
 * 归档组织方式等来进行归档处理
 * 
 * 归档路径（dir）的配置以 / 开头，则认为是绝对路径，否则则判断为相对路径
 * 归档类型（type）支持 json 格式，此参数可忽略，如果不写则默认 json
 * 归档间隔时间（interval）
 */
module.exports = exports = {
	init: (config) => {

		if (!Object.isEmpty(config)) return; // 如果没有配置，则直接终止所有的配置

		const {dir, type, interval} = config;
		type = type || "json";

		const archive = {};

		return archive;
	}
}
