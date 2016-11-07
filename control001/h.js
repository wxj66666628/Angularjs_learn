var ua = navigator.userAgent.toLowerCase();
	 
/***********************************************************************************************
Part 0 —— 定义huax js扩展库名字空间，创建通用的haux基础方法
***********************************************************************************************/
if(!window.$h){
	//a. 基本的js语法补充代码，涉及对象、数组、字符串、信数传输等
	$h = {};
	//d. 定义haux自有ui组件
	$h.ui = {};
	//e.定义haux对时间的控制逻辑
	$h.time = {};
}
$h.element = function(tagName, attributeObj){
	var targetElement = null;
	var targetElement = document.createElement(tagName);
	if(attributeObj){
		for(property in attributeObj){
			var value = attributeObj[property];
			if(value || value === 0){
				if(["innerText", "innerHTML", "className"].indexOf(property) >= 0){
					targetElement[property] = value;
				}
				else{
					targetElement.setAttribute(property, value);
				}
			}
		}
	}
	return targetElement;
};

/***********************************************************************************************
	Part 2 —— 创建全局haux基础方法，
***********************************************************************************************/
$h.time.setServiceTime = function(text){
	var shiftSeconds = Date.parse(text.replace(/-/g, "/")) - (new Date()).getTime();
	sessionStorage.setItem("shiftSeconds", shiftSeconds);
};

$h.time.getServiceTime = function(){
	var shiftSeconds = sessionStorage.getItem("shiftSeconds") || 0;
	return new Date((new Date()).getTime() + parseInt(shiftSeconds));
};

$h.time.getDateInterval = function(firstDateStr, secondDateStr){
	var result = {describe:""};
	var firstDate = new Date(Date.parse(firstDateStr.replace(/-/g, "/")));
	var secondDate = new Date(Date.parse(secondDateStr.replace(/-/g, "/")));
	
	//计算两个日期之间相差的毫秒数
	var milliseconds = firstDate.getTime() - secondDate.getTime();
	var secondCount = Math.floor(milliseconds / 1000);
	result.seconds = secondCount;
	
	var second = secondCount % 60;
	var minute = Math.floor(secondCount / 60) % 60;
	var hour = Math.floor(secondCount / 60 / 60) % 24;
	var day = Math.floor(secondCount / 60 / 60 / 24);
	
	if(day)
		result.describe += day + "天";
	if(hour)
		result.describe += hour + "小时";
	if(minute)
		result.describe += minute + "分钟";
	if(second && !day && !hour)
		result.describe += second + "秒";
	
	return result;
};

$h.time.service = (function(){
	//闭包内缓存(服务器时间-浏览器所在操作系统时间)得到的偏移量
	var offset = sessionStorage && sessionStorage.getItem("serviceTimeOffset");
	offset = offset ? parseInt(offset) : 0;
	return function(){
		if(arguments.length == 0){//get方法
			return new Date((new Date()).getTime() + offset); 
		}
		else{
			var text = arguments[0];
			if(text){
				offset = Date.parse(text.replace(/-/g, "/")) - (new Date()).getTime();
				sessionStorage && sessionStorage.setItem("serviceTimeOffset", offset)
			}
		}
	}
})();

$h.location = {};
$h.location.search = function(){
	var search = {};
	var searchText = window.location.search;
	if(searchText){
		var pairs = searchText.substring(1).split("&");
		pairs.forEach(function(pair){
			var array = pair.split("=");
			var key = array[0];
			var value = array[1];
			if(search.hasOwnProperty(key)){
				var existValue = search[key];
				if(existValue instanceof Array){
					existValue.push(value);
				}
				else{
					search[key] = [existValue, value];
				}
			}
			else{
				search[key] = decodeURIComponent(value);
			}
		});
	}
	return arguments.length == 0 ? search : search[arguments[0]];
};

//替换当前url中的个别search内容，得到新的href文本
$h.location.resetSearch = function(path){
	var index = path.indexOf("?");
	if(index >= 0){
		
	}
	
	//1.
	var href = window.location.href;
	var search = window.location.search || "?";
	var index = href.indexOf(search);
	var hrefHead = index > 0 ? href.substring(0, index) : href;
	
	//2.遍历arguments对象，替换search中全部的key
	var paramTexts = search.substr(1).split("&");
	for(var i = 0; i < Math.floor(arguments.length / 2); i++){
		var key = arguments[i * 2];
		var value = arguments[i * 2 + 1];
		if(value === null || value === "" || typeof(value) == "undefined"){
			_removeParam(key, value);
		}
		else{
			_setParam(key, value);
		}
	}
	
	//3.返回
	return paramTexts.length ? hrefHead + "?" + paramTexts.join("&") : hrefHead;
	
	function _setParam(key, value){
		for(var i = 0; i < paramTexts.length; i++){
			var paramText = paramTexts[i];
			if(paramText == key || paramText.startsWith(key + "=")){
				paramTexts[i] = key + "=" + encodeURIComponent(value);
				return;
			}
		}
		paramTexts.push(key + "=" + encodeURIComponent(value));
	}
	
	function _removeParam(key){
		for(var i = 0; i < paramTexts.length; i++){
			var paramText = paramTexts[i];
			if(paramText == key || paramText.startsWith(key + "=")){
				paramTexts.splice(i, 1);
				return;
			}
		}
	}
};

$h.location.getUrl = function(path){
	//1.计算基础路径
	path = path || $h.home();
	
	if(!path.startsWith("http") && !path.startsWith("file")){
		path = $h.home() + (path[0] == "/" ? path : "/" + path);
	}
	
	//2.读取arguments对象，生成search内容
	if(arguments.length >= 2){
		var paramTexts = [];
		var arg1 = arguments[1];
		if(typeof(arg1) == "string"){
			for(var i = 1; i < arguments.length; i = i + 2){
				var key = arguments[i];
				var value = arguments[i + 1];
				if(value || value === 0 || value === false){
					paramTexts.push(key + "=" + encodeURIComponent(value));
				}
				
			}
		}
		else{
			for(var key in arg1){
				var value = arg1[key];
				if(value || value === 0 || value === false){
					paramTexts.push(key + "=" + encodeURIComponent(value));
				}
			}
		}
		
		path += path.indexOf("?") >= 0 ? paramTexts.join("&") : "?" + paramTexts.join("&");
	}

	return path;
};

/***********************************************************************************************
	Part 4 —— 全局页面修正、框架调整、页面渲染等
*********************************************************************s**************************/
//4.公用js函数定义
$h.appName = "gift12345";
$h.home = function(appName) {
	//1.计算项目的根目录
	var host = location.host;
	var url = location.protocol + "//" + host;
	//2.查看当前路径是否带了通用的appName
	if(location.href.indexOf(host + "/" + $h.appName) >= 0){
		url += "/" + $h.appName;
	}
	//3.检查是否带了专用的web app路径
	if(appName && location.href.indexOf(host + "/" + $h.appName + "/" + appName) >= 0){
		url += "/" + appName;
	}
	return url;
};

$h.cookie = {};
$h.cookie.get = function(key){
	//var cookie = document.cookie;
	var cookies = document.cookie.split(";");
		for(var i = 0; i < cookies.length; i++){
			var pair = cookies[i].split('=');
			var first = pair[0].replace(/(^\s*)|(\s*$)/g,"");
				if(first === key){
					return unescape(pair[1]);
				}
		}
		return null;
};

$h.cookie.set = function(key, value, days){
	days = days || 30;
		var exp = new Date();
		exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
		document.cookie = key + "="+ escape(value) + ";expires=" + exp.toGMTString() + ";path=/";
};

$h.cookie.remove = function(key){
	$h.cookie.set(key, "", -1);	
};

$h.getOptionsFromTrees = function(trees, seperator){
	seperator = seperator || "_";
	var options = [];
	_addOptions(trees, "");
	return options;
	
	function _addOptions(trees, prefix){
		if(!trees){
			return;
		}
		for(var i = 0; i < trees.length; i++){
			var tree = trees[i];
			var bean = tree.bean;
			options.push({v:bean.id, t:(prefix + bean.name)});
			var childs = tree.childs;
			if(childs && childs.length){
				_addOptions(childs, prefix + seperator);
			}
		}
	}
};

$h.isNumber = function(data, forbidTypeCast){
	return typeof(data) == "number" || !forbidTypeCast && $h.reg.number.test(data);
};

$h.isNum = $h.isNumber;
$h.isInt = function(data, forbidTypeCast){
	return typeof(data) == "integer" || !forbidTypeCast && $h.reg.int.test(data);
};

$h.isInteger = $h.isInt;
$h.isPositiveInt = function(data, forbidTypeCast){
	return typeof(data) == "number" || !forbidTypeCast && $h.reg.positiveInt.test(data);
};

$h.isObject = function(data){
	return typeof(data) == "object";
};

$h.isFunction = function(data){
	return typeof(data) == "function";
};

$h.isString = function(data){
	return typeof(data) == "string";
};

$h.isMobile = function(data){
	return $h.reg.mobile.test(data);
};

$h.typeOf = function(target){
	if(target === null){
		return "null";//typeof null = "object",所以要提前判断
	}
	var type = typeof(target);
	if ("object" == type) {
		var text = Object.prototype.toString.call(target);
		switch(text){
			case "[object Array]":
				return "array";
			case "[object RegExp]":
				return "regexp";
			default:
				return type;
		}	
	}
	else if("number" == type){
		return /^[-]?([0-9]+\d*)$/.test(target) ? "integer" : "number";
	}
	else{
		return type;
	}
};

/**
 * 从某个函数的arguments数组中，根据数据类型自定匹配对应的数据
 * 如，输入为[1, "1", {}],则返回{integer : 1, string : "1", object : {}}的json格式
 */
$h.reverseArguments = function(args, start, end){
	var typeMap = {};
	
	if(args && args.length){
		start = start || 0;
		end = end || args.length;
		for(var i = start; i < end; i++){
			var arg = args[i];
			var type = $h.typeOf(arg);
			if(!typeMap.hasOwnProperty(type)){
				typeMap[type] = arg;
			}
		}
	}
	return typeMap;
};
/**
 * session sessionStorage
 * 操作
 */
$h.setSession = function(key,data){
	sessionStorage.setItem(key, JSON.stringify(data));
};

$h.getSession = function(key){
	var sessionData = sessionStorage.getItem(key);
	if(sessionData==null){
		return null;
	}
	return JSON.parse(sessionData);
};

$h.clearSession = function(key){
	window.sessionStorage.removeItem(key);
};

$h.array = {};
$h.array.exchange = function(array, from, to){
	var fromObj = array[from], 
		toObj = array[to];
	
	if(angular){
		fromObj = angular.copy(fromObj);
		toObj = angular.copy(toObj);
	}
	
	array[to] = fromObj;
	array[from] = toObj;
};

$h.localStorage = {};
$h.localStorage.getJSON = function(key, throwException){
	var value = localStorage.getItem(key);
	try{
		return angular && angular.fromJson(value) || JSON.parse(value);
	}
	catch(e){
		var detail = "localString.getJSON error : key=" + key + ";value=" + value;
		console.log(detail);
		if(throwException){
			throw new Error(detail);
		}
		else{
			return null;
		}
	}
}

$h.localStorage.saveJSON = function(key, value){
	var text =	angular && angular.toJson(value) || JSON.stringify(value);
	localStorage.setItem(key, text);
}

$h.localStorage.removeJSON = function(key){
	localStorage.removeItem(key);
}

//myq add 2016-6-13，将常用的正则表达式进行缓存，避免每次都要baidu
$h.reg = {
	email : /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+(.[a-zA-Z0-9_-])+/,
	mobile : /^0?1[3|4|5|8][0-9]\d{8}$/,
	int : /^[-]?([0-9]+\d*)$/,
	positiveInt : /^([1-9]+\d*)$/,
	number : /^(-?\d+)(\.\d+)?$/,
	date : /^(\d{4})-(\d{2})-(\d{2})$/,
	datetime : /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/
};

/** fix ie6-8 array.prototype缺失的forEac/map/filter等高级语法
 * 来自：http://www.zhangxinxu.com/study/201304/es5-array.js
 */
Array.prototype.forEach = Array.prototype.forEach || function (fn, thisObj) {
	for (var k = 0, length = this.length; k < length; k++) {
		fn.call(thisObj, this[k], k, this);
	}
};
Array.prototype.map = Array.prototype.map || function (fn, thisObj) {
	var arr = [];
	for (var k = 0, length = this.length; k < length; k++) {
		arr.push(fn.call(thisObj, this[k], k, this));
	}
	return arr;
};

Array.prototype.filter = Array.prototype.filter || function (fn, thisObj) {
	var arr = [];
	for (var k = 0, length = this.length; k < length; k++) {
		fn.call(thisObj, this[k], k, this) && arr.push(this[k]);
	}
	return arr;
};

Array.prototype.some = Array.prototype.some || function (fn, thisObj) {
	for (var k = 0, length = this.length; k < length; k++) {
		if(fn.call(thisObj, this[k], k, this)){
			return true;
		}
	}
	return false;
};

Array.prototype.every = Array.prototype.every || function (fn, thisObj) {
	for (var k = 0, length = this.length; k < length; k++) {
		if(!fn.call(thisObj, this[k], k, this)){
			return false;
		}
	}
	return true;
};

Array.prototype.indexOf = Array.prototype.indexOf || function (searchElement, fromIndex) {
	fromIndex = fromIndex * 1 || 0;
	for (var k = fromIndex, length = this.length; k < length; k++) {
		if (this[k] === searchElement) {
			return k;
		}
	}
	return -1;
};

Array.prototype.lastIndexOf = Array.prototype.lastIndexOf || function (searchElement, fromIndex) {
	fromIndex = fromIndex * 1 || this.length - 1;
	for (var k = fromIndex; k > -1; k--) {
		if (this[k] === searchElement) {
			return k;
		}
	}
	return -1;
};

Array.prototype.reduce = Array.prototype.reduce || function (fn, initialValue ) {
	var previous = initialValue, startIndex = 0;
	if (typeof initialValue === "undefined") {
		previous = this[0];
		startIndex = 1;
	}
	
	for (var k = startIndex; k < this.length; k++) {
		previous = fn(previous, this[k], k, this);
	}
	return previous;
};

Array.prototype.reduceRight = Array.prototype.reduceRight || function (fn, initialValue ) {
	var previous = initialValue, startIndex = this.length - 1;
	if (typeof initialValue === "undefined") {
		previous = this[startIndex];
		startIndex--;
	}
	
	for (var k = startIndex; k >= 0; k--) {
		previous = fn(previous, this[k], k, this);
	}
	return previous;
};
//myq add 2016.9.20，计算所有item的总和。这个是js不含有的
Array.prototype.sum = function (fn, startIndex) {
	var sum = 0;
	startIndex = startIndex || 0;
	if(startIndex >= 0){
		for (var k = startIndex; k < this.length; k++) {
			sum += fn(this[k], k, this);
		}
	}
	else{
		for (var k = this.length - 1 + startIndex; k >= 0; k--) {
			sum += fn(this[k], k, this);
		}
	}
	return sum;
};
Array.prototype.min = function (fn, startIndex) {
	var values = [];
	startIndex = startIndex || 0;
	if(startIndex >= 0){
		for (var k = startIndex; k < this.length; k++) {
			values.push(fn(this[k], k, this));
		}
	}
	else{
		for (var k = this.length - 1 + startIndex; k >= 0; k--) {
			values.push(fn(this[k], k, this));
		}
	}
	return Math.min.apply(this, values);
};

Array.prototype.max = function (fn, startIndex) {
	var values = [];
	startIndex = startIndex || 0;
	if(startIndex >= 0){
		for (var k = startIndex; k < this.length; k++) {
			values.push(fn(this[k], k, this));
		}
	}
	else{
		for (var k = this.length - 1 + startIndex; k >= 0; k--) {
			values.push(fn(this[k], k, this));
		}
	}
	return Math.max.apply(this, values);
};
