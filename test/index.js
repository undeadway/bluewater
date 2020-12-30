require("coralian");
let bluewater = require("../src/index");

let db1 = bluewater();

db1.listBlogClass({
	success : bg => {
		console.log(bg);
	}
});

db1.updateUserClassic( {
	success : ret => {
		console.log(ret);
	},
	paras : {
		bid : 1227539226000
	}
});

db1.insertTag({
	success : ret => {
		console.log(ret);
	},
	paras : {
		tname : Date.now()
	}
});

// db1.transaction([
// 	{
// 		name : "",
// 		paras : {},
// 		success : () => {}
// 	}
// ], err => {});

