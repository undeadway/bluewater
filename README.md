# Chinese
一个基于 Node.js 的数据库接口适配器。  
与数据库无关的接口库，用于弥合各种不同的数据库驱动的语法造成的使用差异。

因为 nodejs 中的各种数据库驱动的语法不完全一致，操作逻辑也大相径庭，所以 bluewater 只是构筑出了一个中间层，可以弥合各个数据库调用间的差异。  
可以使用统一的形式来调用各种不同的数据库驱动.

使用的时候只要：

```
let bluewater = require("bluewater");
let db = bluewater();

db.getList({
	paras : {},
	success : () => {}
});
```

最后用 db 变量来调用定义好的方法，如：
```
db.getList(); // 这个 list 方法定义在 sql.json 中
```
`bluewater` 只负责将 getList 要进行的是哪种操作（增删改查）、所要操作的sql 等  
映射到各个数据库驱动中去，但 如何实现 getList  
实际的操作依然还是交给各个数据库驱动自己去实现

## 使用
**因为使用了 `await` ，所以请注意 nodejs 的版本。**  
`bluewater` 是数据库驱动的中介，本身并不包含数据库驱动。
支持的数据库驱动如下表：

| 名称 | 驱动地址 |
| --- | --- |
| sqlite3 | https://github.com/mapbox/node-sqlite3 |
| postgres | https://github.com/brianc/node-postgres |

### 预编译
`bluewater` 所有的 sql 都是 prepare 级别的。  
同时，因为 `?` 的预编译语法一旦数据较多，很容易搞不清楚谁是谁，所以 `bluewater` 提供了类似
```
SELECT * FROM TABLE WHERE ID = #[id]
```
这种形式，交由 `bluewater` 编译成通用SQL。

### 查询和修改
支持`insert` 、`delete` 、`update` 、`select` 等基本操作，存储过程（proceduer）、自定义函数（function）等要看所对应的数据库是否支持而定。

### 事务
事务靠一连串的sql拼接而成，所以专门提供一个 `transaction` 函数来执行。
```
db.transaction([...]);
```

### 使用方式
将 `res` 文件夹复制到**项目根目录**下，打开 `bluewater.json` 可以看到以下内容。
```
{
	"database-name": "", // 这是数据库类型，写上所要使用的数据库驱动名
	"connection": {
		"url": "", // 数据库的链接
		"name": "", // 数据库名
		"user": "", // 数据库用户名
		"passwd": "", // 数据库用户密码
	},
	"port" : "", // 数据库端口
	"cache": true, // 是否使用缓存
	"method-query":"ON" // 是否启动方法式调用
}
```

按照以上信息配置 `bluewater.json` ，需要按安丘配置数据库类型（database-name）、连接信息等。

在使用时， 通过使用：
```
let db = bluewater();
```
来创建 `bluewater` 的实例，外部调用不用知道内部逻辑，全部交给各个数据库的驱动自己来实现。  
在实例创建之后，只要通过 其实例调用在 `sql.json` 中定义好的方法就可以了。

### sql.json
在 `bluewater.json` 的同目录下建立一个 `sql.json` 的文件，用于记录所有的sql。

#### 调用格式
```
{
	"getList" : {
		"method" : "select",
		"sql" : "SELECT * FROM TBL_NAME WHERE ID = #[id]"
	}
}
```

在外部使用的时候只要
```
db.query({
	name: "getList",
	success : [Function],
	paras : {
		id : 1234567890
	}
});
```
sql中的 `#[id]` 和之后代码中的 `id` 对应。

#### 高级格式
因为可能存在不同条件下，需要对sql加入某些条件变化，所以 `bluewater` 也支持在sql中添加条件参数。  
如，查看通知，有`过期`和`未过期`两个选项，写出的sql大概如下：
```
SELECT * FROM NOTICE ?[inTime] ?[outTime]
```
在 `bluewater.json` 中则表现为：
```
{
	"listNotice" : {
		"method" : "select",
		"sql" : "SELECT * FROM NOTICE WHERE TIMEOUT ?[inTime] ?[outTime] #[timeout]",
		"condition" : {
			"inTime" : " > ",
			"outTime" : " <= "
		}
	}
}
```

### 方法式调用
如果 `bluewater.json` 中的 `method-query` 配置为 `ON` ，就可以使用方法式调用。  
一般情况下，SQL的调用是用
```
db.query({
	"name": "getList",
	success : [Function],
	paras : {
		id : 1234567890
	}
});
```
这种方法来写的，如果开启了方法式调用，则能通过下面这种方法来写代码。
```
db.getList({
	success : [Function],
	paras : {
		id : 1234567890
	}
});
```
**方法式调用不默认开启，必须将 `bluewater.json` 中的 `method-query` 配置为 `ON` 才能使用**。

#### 参数中带参
执行插入语句的时候，因为肯能会带参，出现类似下面的sql：
```
INSER INTO TABLE(PK_COLUMN ?[hasColumn(name)]) VALUES(123 ?[hasColumn(value)])
```
而 `sql.json` 的配置则是
```
{
	"listNotice" : {
		"method" : "select",
		"sql" : "INSER INTO TABLE(PK_COLUMN ?[hasColumn(name)]) VALUES(123 ?[hasColumn(value)])",
		"condition" : {
			"hasColumn" :  {
				"name" : ', COLUMN_NAME',
				"value" : ', #[column]'
			}
		}
	}
}
```

## License
Apache-2.0


# English

This is a Node.js based database interface adapter, an database-agnostic interface library,   
designed to bridge the usage discrepancies caused by diverse database driver syntaxes.".

Due to the inconsistent syntax and vastly different operational logic among various database drivers in Node.js,  
Bluewater serves as a middleware layer that reconciles the disparities between different database calls.  
It enables the use of a unified approach to invoke a multitude of diverse database drivers.

Used like:

```
let bluewater = require("bluewater");
let db = bluewater();

db.getList({
	paras : {},
	success : () => {}
});
```

## About

Bluewater is not the driver of any database drivers, it is not contains any database driver.  
It is only a 


Supported db driver list is :

| Name | URL |
| --- | --- |
| sqlite3 | https://github.com/mapbox/node-sqlite3 |
| postgres | https://github.com/brianc/node-postgres |

## License
Apache-2.0

