angular.module("h.ui", [])
.directive("huiLines", [
 function() {
 	return {
 		restrict : 'E',
 		scope : {
 			value : "@"
 		},
 		template : ['<p ng-repeat="line in lines">{{line}}</p>'].join("\n"),
 		replace : true,
 		link : function(scope, iElement, iAttrs) {
 			//console.log(JSON.stringify(iAttrs));
 			scope.$watch("value", function(text){
 				scope.lines = text && text.split("\n") || null;
 			});
 		}
 	};
 }])
.directive("huiPagination", ["$location", 
function($location) {
	return {
		restrict : 'E',
		scope : {
			pageNo : "@",
			pageCount : "@",
			onSelect : "&"
		},
		template : ['<div class="hui-pagination">',
								'	<a ng-click="previous()" ng-class="{disabled: pageNo <= 1}">',
								'		<i class="fa fa-angle-left"></i>',
								'	</a>',
								'	<a ng-if="pages[0] > 1" ng-click="forward(1)">1</a>',
								'	<span ng-if="pages[0] >	2">……</span>',
								'	<a ng-repeat="row in pages" ng-class="{active: pageNo == row}" ng-click="forward(row)">{{row}}</a>',
								'	<a ng-click="next()" ng-class="{disabled: pageNo >= pageCount}">',
								'			<i class="fa fa-angle-right"></i>',
								'	</a>',
								'	<span>',
								'		共{{pageCount}}页，到',
								'		<input type="number" ng-model="inputPage" />页',
								'		<a ng-click="forward(inputPage)">确定</a>',
								'	</span>',
								'</div>'].join("\n"),
		replace : true,
		link : function(scope, iElement, iAttrs) {
			//console.log(JSON.stringify(iAttrs));
			scope.$watch("pageNo", _resetPages);
			scope.$watch("pageCount", _resetPages);
			
			function _resetPages(){
				scope.pages = [];
				if($h.isInt(scope.pageNo) && $h.isInt(scope.pageCount)){
					scope.pageNo = parseInt(scope.pageNo);
					scope.pageCount = parseInt(scope.pageCount);
					var interval = 2;
					var startIndex = Math.max(1, scope.pageNo - interval);
					var endIndex = Math.min(scope.pageNo + interval, scope.pageCount);
					for (var i = startIndex; i <= endIndex; i++) {
						scope.pages.push(i);
					}

					scope.inputPage = Math.min(scope.pageNo + 1, scope.pageCount);
				}
				
			}
			
			scope.$watch("inputPage", function(newValue, oldValue) {
				if(!/^[1-9][0-9]*$/.test(newValue)){
					scope.inputPage = oldValue;
					return;
				};
				
				//2.不能大于page.count;
				var newIndex = parseInt(newValue);
				if(newIndex > scope.pageCount){
					scope.inputPage = scope.pageCount;
				}
			});
			
			scope.previous = function() {
				if (scope.pageNo > 1) {
					scope.forward(scope.pageNo - 1);
				}
			};
			scope.next = function() {
				if (scope.pageNo < scope.pageCount) {
					scope.forward(scope.pageNo + 1);
				}
			};

			var customForward = !!iAttrs.onSelect;
			scope.forward = function(pn) {
				if (scope.pageNo != pn) {
					if(customForward){
						scope.onSelect({pn : pn});
					}
					else{
						$location.search("pn", pn);
					}
				}
			};
		}
	};
}])
.directive('huiArea', function() {
	return {
		restrict : 'E',
		scope : {
			model : '=ngModel',
			placeholder : "@"
		},
		template : ['<span class="hui-area">',
								'	<label>{{name||placeholder}}</label>',
								'	<a ng-click="showPickPanel($event)"><i class="fa fa-search"></i></a>',
								'	<div class="hui-area-pick" ng-if="showPanel" ng-style={{pickStyle}}>',
								'		<div ng-if="startLevel <= 1 && endLevel >= 1"><ul><li ng-repeat="row in provinces" ng-class="{\'selected\':row.id == pId}" ng-click="selectProvince(row)">{{row.name}}</li></ul></div>',
								'		<div ng-if="startLevel <= 2 && endLevel >= 2"><ul><li ng-repeat="row in cities	 " ng-class="{\'selected\':row.id == cId}" ng-click="selectCity(row)		">{{row.name}}</li></ul></div>',
								'		<div ng-if="startLevel <= 3 && endLevel >= 3"><ul><li ng-repeat="row in districts" ng-class="{\'selected\':row.id == dId}" ng-click="selectDistrict(row)">{{row.name}}</li></ul></div>',
								'	</div>',
								'</span>'].join("\n"),
		replace : true,
		controller : "huiAreaCtrl"
	};
})

.controller("huiAreaCtrl", ["$scope", "$q", "$hui", "AreaService",
function($scope, $q, $hui, AreaService){
	
	var closeListenFn = $scope.$watch("model", function(newValue, oldValue){
		if(!oldValue && newValue){
			AreaService.get(newValue)
			.then(function(area){
				$scope.name = area.fullName;
			});
			closeListenFn();
			closeListenFn = null;
		}
	});

	$scope.selectProvince = function(province){
		if($scope.pId != province.id){
			$scope.pId = province.id;
			_resetOptions("city", province.id);
		}
	};

	$scope.selectCity = function(city){
		if($scope.cId != city.id){
			$scope.cId = city.id;
			$scope.endLevel == 2 ? _choose(city) : _resetOptions("district", city.id);
		}
	};
	
	$scope.selectDistrict = function(district){
		$scope.dId = district.id;
		if($scope.endLevel == 3){
			_choose(district);
		}
	};
	
	var levelMap = {"province":1, "city":2, "district":3};
	$scope.showPickPanel = function($event){
		if($scope.showPanel){
			return;
		}
		
		setTimeout(function(){
			window.addEventListener("click", _click);
		}, 0);
		
		var target = $event.target;
		element = target.tagName == "A" ? target.parentNode : target.parentNode.parentNode;
		var start = element.getAttribute("start") || "province";
		var end = element.getAttribute("end") || "district";
		$scope.startLevel = levelMap[start];
		$scope.endLevel = levelMap[end];
		$scope.pickStyle = {};
		$scope.pickStyle.width = 160 * ($scope.endLevel - $scope.startLevel + 1) + "px";
		
		$q.when()
		.then(function(){
			return _resetOptions(start, element.getAttribute("root-id"));
		})
		.then(function(){
			$scope.showPanel = true;
		}, function(reason){
			reason && $hui.toast(reason.error || reason);
		});
	};
	
	$scope.closePickPanel = function(){
		if($scope.showPanel){
			$scope.showPanel = false;
			window.removeEventListener("click", _click);
		}
	};
	
	var element;
	function _click(ev){
		if(element.getElementsByTagName("div")[0].contains(ev.target)){
			return;
		}
		$scope.$apply($scope.closePickPanel);
	}
	
	//更新省市区候选数组，target = Province、City、District
	function _resetOptions(target, parentId){
		return target == "province" && AreaService.getProvinces()
					.then(function(areas){
						$scope.provinces = areas;
						$scope.cities = [];
						$scope.districts = [];
					})
			|| target == "city" && AreaService.getCities(parentId)
					.then(function(areas){
						$scope.cities = areas;
						$scope.districts = [];
					})
			|| target == "district" && AreaService.getDistricts(parentId)
					.then(function(areas){
						$scope.districts = areas;
					})
			|| $q.reject("start attribute is invalid : " + start);
	}
	
	function _choose(area){
		$scope.name = area.fullName;
		$scope.model = area.id;
		$scope.closePickPanel();
		if(closeListenFn){
			closeListenFn();
			closeListenFn = null;
		}
	}
}])

/** hui-validate attributes 说明
 	model:本指令检验的model，如"bean.name"/"bean.price"等
 	type:数据类型，暂时只包含 text/number/integer/date/datetime这几类，未来可能扩展到email、password等
 	required:不允许为空
	max:最大值(number/integer)　最大日期(date:yyyy-mm-dd, datetime:yyyy-mm-dd hh:si:mi)
	min:最小值(number/integer)　最小日期(date:yyyy-mm-dd, datetime:yyyy-mm-dd hh:si:mi)
	max/min:最大、最小长度(text/password)、
	pattern:正则表达式字符串;
	customize:在上级scope自定义的验证函数，如果验证失败则返回错误说明
	errors:自定义的错误说明规则
**/
.directive('huiValidate', ["$huiValidateDelegate", "$timeout", function($huiValidateDelegate, $timeout) {
	var _dataTypeTrans = {"int":"integer", "double":"number", "float":"number", "num":"number"};
	var _validateKeys = ["customize", "required", "pattern", "format", "range", "length"];
	
	return {
		restrict : 'EA',
		template : '<div class="hui-validate"><p ng-if="$error" ng-style="style" ng-show="$show" class="hui-validate-error">{{$error}}</p></div>',
		replace : true,
		scope: true,
		link : function(scope, element, attrs) {
			//Part 0.定义节流监听函数，在用户进行连续输入时，只检查最后一次输入的数值，提高效率
			var timeout;
			var _throttleWatchModel = function(newValue, oldValue){
				//console.log("hui-validate watch : " + attrs.ngModel);
				if(timeout){
					$timeout.cancel(timeout);
					timeout = null;
				}
				timeout = $timeout(function(){
					console.log("hui-validate run : " + attrs.ngModel);
					_watchModel(newValue, oldValue);
				}, 200);
			}
			
			//Part 1. 初始化model监听器，开始监听mode的变化;model、watch属性发生变化时，也要需要重置监听器
			var closeWatchFns = [];
			_watchModels();
			attrs.$observe("model", function(newValue, oldValue){
				_watchModels();
			});
			attrs.$observe("watch", function(newValue, oldValue){
				_watchModels();
			});
			
			//Part 2. 监听父域发送的广播，以便确定是否在界面上显示错误结果（默认是隐藏的）
			scope.$on("hui-validate-error-show", function(event){
				if(arguments.length > 1){//只是通知某个model的验证错误显示出来而已
					var targetModel = arguments[1];
					scope.$show = scope.$show || targetModel == attrs.model;
				}
				else{
					scope.$show = true;
				}
				scope.style = {};
				attrs.left && (scope.style.left = attrs.left);
				attrs.top && (scope.style.top = attrs.top);
				attrs.bottom && (scope.style.bottom = attrs.bottom);
				attrs.right && (scope.style.right = attrs.right);
			});
			scope.$on("hui-validate-error-hidden", function(event){
				scope.$show = false;
			});
			
			//Part III 具体的监听启动函数
			function _watchModels(){
				if(!attrs.model){
					return;
				}
				
				//1.先清空之前的旧监听器
				closeWatchFns.forEach(function(closeWathFn){
					closeWathFn();
				});
				closeWatchFns = [];
				
				//2.监听自己
				closeWatchFns[0] = scope.$watch(attrs.model, function(newValue, oldValue){
					_throttleWatchModel(newValue, oldValue);//_watchModel(newValue, oldValue);
				});
				
				//3.监听其他关联的model
				var watchModels = [];
				attrs.watch && attrs.watch.split(" ").forEach(function(model){
					if(model && watchModels.indexOf(model) == -1){
						watchModels.push(model);
						var closeWatchFn = scope.$watch(model, function(){
							var value = scope.$eval(attrs.model);
							_throttleWatchModel(value, value);//_watchModel(value, value);
						}, true);
						closeWatchFns.push(closeWatchFn);
					}
				});
			}
			
			//III.具体的监听函数，改成动态读取各类属性，动态校验 + 节流
			function _watchModel(newValue, oldValue){
				
				//1.获取全部的验证规则
				var rules = {};//每一个选项的格式为{name:"required", func:对应的验证函数, params:验证参数，可以是原始数据or object}
				var dataType = _dataTypeTrans[attrs.type] || attrs.type || "text";
				//1.1 required
				attrs.hasOwnProperty("required") && attrs.required !== false && (rules["required"] = true);
				//1.2 range for input/textarea
				var range = dataType && $huiValidateDelegate.getRange(attrs, dataType);
				range && (rules[dataType == "text" && "length" || "range"] = range);
				if(dataType == "text"){//1.3 正则表达验证
					attrs.pattern && (rules["pattern"] = $h.reg[attrs.pattern] || new RegExp(attrs.pattern));
				}
				else{//1.4 数据输入格式校验	
					rules["format"] = dataType;
				}
				//1.5 customize function in page
				attrs.customize && (rules["customize"] = attrs.customize);//1.5.自定义校验函数
				
				//2.依次监测每个条件是否符合，一旦某个规则检出错误，马上退出并记录 ["customize", "required", "pattern", "format", "range"]
				delete scope.$error;
				_validateKeys.some(function(key){
					if(rules.hasOwnProperty(key)){
						var params = rules[key], 
							result = $huiValidateDelegate.validate(key, attrs, newValue, dataType, params, scope);
						if($h.isString(result)){//error，返回&停止监测
							return scope.$error = result;
						}
						result && result.then && result.then(function(error){//处理promise异步返回的验证结果
							error && (scope.$error = error);
						});
					}
				});
			}
		}
	};

}])

.factory("$huiValidateDelegate", ["$q", function($q){
	var _prompts = {}, _validateFns = {customize : _testCustomize, 
			required : _testRequired, pattern : _testPattern, 
			format : _testFormat, range : _testRange, length : _testLength};
	return {
		getRange:function (attrs, dataType){
			return dataType == "text" && _getRange(attrs, $h.reg.int, parseInt)//1.2 data range
				|| dataType == "number" &&　_getRange(attrs, $h.reg.number, parseFloat)
				|| dataType == "integer" && _getRange(attrs, $h.reg.int, parseInt)
				|| dataType == "date" && _getRange(attrs, $h.reg.date)
				|| dataType == "datetime" && _getRange(attrs, $h.reg.datetime);
		},
		validate:function(key, attrs, value, dataType, params, scope){
			var fn = _validateFns[key];
			return fn && fn(attrs, value, dataType, params, scope);
		},
		setPrompt:function(type, text){
			_prompts[type] = text;
			return this;
		},
		clearPrompts:function(){
			_prompts = {};
			return this;
		},
		resetPrompts:function(promps){
			_prompts = angular.copy(promps);
			return this;
		}
	}
	
	function _getRange(attrs, reg, parser){
		var range = {};
		attrs.max && reg.test(attrs.max) && (range.max = parser ? parser(attrs.max) : attrs.max);
		attrs.min && reg.test(attrs.min) && (range.min = parser ? parser(attrs.min) : attrs.min);
		return (range.min || range.max) && range;
	}

	function _testRequired(attrs, value, dataType, params, scope){
		if(!value && value !== 0){
			return _getErrorPrompt(attrs, "require", "不能为空");
		}
	}
	
	function _testFormat(attrs, value, dataType, params, scope){
		if(!value && value !== 0){
			return;
		}
		else if(dataType == "integer"){
			return !$h.isInt(value) && _getErrorPrompt(attrs, "format", "请输入有效的整数");
		}
		else if(dataType == "number"){
			return !$h.isNum(value) && _getErrorPrompt(attrs, "format", "请输入有效的数字");
		}
		else if(dataType == "date"){
			return !$h.reg.date.test(value) 
				&& !$h.reg.datetime.test(value)
				&& _getErrorPrompt(attrs, "format", "请输入有效的日期，格式为 2015-08-29");
		}
		else if(dataType == "datetime"){
			return !$h.reg.datetime.test(value) && _getErrorPrompt(attrs, "format", "请输入有效的时间，格式为 2015-08-29 23:31:21");
		}
	}
	
	function _testRange(attrs, value, dataType, range, scope){
		if(!value && value !== 0){
			return;
		}
		var max = range.max, min = range.min;
		if(dataType == "integer" || dataType == "number"){
			var i = dataType == "integer" ? parseInt(value) : parseFloat(value);
			return i > max && _getErrorPrompt(attrs, "max", "数值不能大于" + max)
				|| i < min && _getErrorPrompt(attrs, "min", "数值不能小于" + min);
		}
		else if(dataType == "date"){
			return value > max && _getErrorPrompt(attrs, "max", "日期不能大于" + max)
				|| value < min && _getErrorPrompt("min", "日期不能小于" + min);
		}
		else if(dataType == "datetime"){
			return value > max && _getErrorPrompt(attrs, "max", "时间不能大于" + max)
				|| value < min && _getErrorPrompt(attrs, "min", "时间不能小于" + min);
		}
	}

	function _testLength(attrs, value, dataType, range, scope){
		var length = value && value.length || 0,
			max = range.max, 
			min = range.min;
		return length > max && _getErrorPrompt(attrs, "max", "最多输入" + max + "个字符")
			|| length < min && _getErrorPrompt(attrs, "min", "最少需要" + min + "个字符");
	}
	
	function _testCustomize(attrs, value, dataType, fnExpression, scope){
		try{
			if(fnExpression.endsWith(")")){
				return scope.$eval(fnExpression);
			}
			else{
				var fn = scope[fnExpression];
				return fn(value, attrs.model, scope);
			}
		}
		catch(e){
			console.log("[" + attrs.model + "] ignore invalide customize : " + fnExpression);
		}
	}
	
	function _testPattern(attrs, value, dataType, reg, scope){
		if(!value && value !== 0){
			return !reg.test(value) && _getErrorPrompt(attrs, "pattern", "请输入正确的数据格式");
		}
	}
	
	function _getErrorPrompt(attrs, type, defaultPrompt){
		
		return attrs[type + "Prompt"] || attrs.prompt 
			|| _prompts[attrs.model + "." + type] || _prompts[attrs.model] 
			|| defaultPrompt;
	}
}])

.directive("huiValidateTarget", function() {
	return {
		require:'ngModel',
		restrict : 'A',
		link:function (scope, elements, attrs, ngModelCtrl) {
			var element = elements[0], 
				tagName = element.tagName,
				eleType = element.type,
				isTextInput = element.tagName == "TEXTAREA"
					|| element.tagName == "INPUT" 
						&& (element.type == "text" || element.type == "password");
			var target = attrs.huiValidateTarget;
			var targetScope = target && scope.$eval(target) || scope;
			var model = attrs.model || attrs.ngModel;
			if(isTextInput){
				element.addEventListener("blur", function(){
					if(element.classList.contains("ng-dirty")){
						targetScope.$broadcast("hui-validate-error-show", model);
					}
				});
			}
			else if(tagName == "SELECT" || tagName == "INPUT" && eleType == "radio"){
				element.addEventListener("change", function(){
					if(element.classList.contains("ng-dirty")){
						targetScope.$broadcast("hui-validate-error-show", model);
					}
				});
			}
			}
	};
})
/**
 * 日期选择器指令，精确到年月日
 */
.directive('huiDate', function() {
	return {
		require:'ngModel',
		restrict : 'A',
		link:function (scope, elements, attrs, ngModelCtrl) {
			//在对应的input元素中，支持max/min两个选项
			var timeout = setTimeout(function(){
				_initLayDate(elements[0], attrs.min, attrs.max, ngModelCtrl);
			}, 500);
			
			attrs.$observe("min", function(){
				if(timeout){
					clearTimeout(timeout);
				}
				timeout = setTimeout(function(){
					_initLayDate(elements[0], attrs.min, attrs.max, ngModelCtrl);
				}, 500);
			});
			
			attrs.$observe("max", function(){
				if(timeout){
					clearTimeout(timeout);
				}
				timeout = setTimeout(function(){
					_initLayDate(elements[0], attrs.min, attrs.max, ngModelCtrl);
				}, 500);
			});
			
			//model value -> view view时，将model中的 yyyy-mm-dd h24:mi:ss切除时分秒
			ngModelCtrl.$formatters.unshift(function(modelValue){
				return $h.reg.datetime.test(modelValue) && modelValue.substr(0, 10) || modelValue;
			});
			
			//如果元素有设置默认的 时:分:秒，则附加上去
			ngModelCtrl.$parsers.unshift(function(viewValue){
				var defaultTime = elements[0].getAttribute("default-time");
				return defaultTime && $h.reg.date.test(viewValue) && (viewValue + " " + defaultTime) || viewValue;
			});
		}
	};
	
	function _initLayDate(element, min, max, ngModelCtrl){
		//var element = element[0]
		var options = {elem : element};
		min && (options.min = min);
		max && (options.max = max);
		options.choose = function(dateText){
			//此处是强制要求angular将laydate组件js返回的文本，强制写入文本输入框，并触发对应的model同步
			ngModelCtrl.$setViewValue(dateText);
		};
		
		laydate(options);
		element.classList.add("hui-date");
	}
})

/**
 * 时间选择器指令，精确到时分秒
 */
.directive('huiDatetime', function() {
	return {
		require:'ngModel',
		restrict : 'A',
		link:function (scope, elements, attrs, ngModelCtrl) {
			setTimeout(function(){
				_initLayDate(elements[0], attrs.min, attrs.max, ngModelCtrl);
			}, 500);
		}
	};
	
	function _initLayDate(element, min, max, ngModelCtrl){
		var options = {elem : element, format:"YYYY-MM-DD hh:mm:ss", istime:true};
		min && (options.min = min);
		max && (options.max = max);
		options.choose = function(dateText){
			//此处是强制要求angular将laydate组件js返回的文本，强制写入文本输入框，并触发对应的model同步
			ngModelCtrl.$setViewValue(dateText);
		};
		
		laydate(options);
		element.classList.add("hui-date");
	}
})

/**
 * 货币输入框，以便将model的值为整数（单位为分），而在view中显示为小数（单位为元，小数点后两位）
 */
.directive('huiMoney', function() {
	return {
		require:'ngModel',
		restrict : 'A',
		link:function (scope, element, attrs, ngModelCtrl) {
			//重写$parser
			//model value -> view view时，将int类型的货币值，转化为带小数点后两位的数值
			ngModelCtrl.$formatters.unshift(function(modelValue){
				if($h.isInt(modelValue)){
					return parseInt(modelValue) / 100;
				}
				else{
					return undefined;
				}
			});
			
			ngModelCtrl.$parsers.unshift(function(viewValue){
				if($h.isNumber(viewValue)){
					return Math.round(parseFloat(viewValue) * 100);
				}
				else{
					return viewValue;
				}
			});
			}
	};
})


/**
 * 自定义的alert、prompt、confirm组件，全部以defer promise与调用者进行交互
 */
.factory("$hui", ["$q", function($q){
	return {
		toast : _toast,
		progressBar : _progressBar,
		progressDialog : _progressDialog,//这个暂时还不能用，切记
		alert : _alert,//美化版的alert，采用自定义element组件生成
		confirm : _confirm,
		prompt : _prompt
	};
	
	/**
		打开一个类似android toast的小界面，固定一个参数，通过对arguments自动识别另外三个参数
		1.text:string类型（必须要有）
		2.duration:弹出窗口显示的持续时间，int类型，默认为2秒，单位为毫秒(可选项)
		3.icon:弹出窗口的icon class,string类型，必须要有
		4.config:，用于控制其它扩展属性——
			a.left/right/bottom/top:动态调整位置属性
			b.
	**/
	function _toast(text){
		var deferred = $q.defer();
		//0.预处理
		if(document.getElementById("hui-toast")){
			return;
		}
		
		//1.获取动态参数
		var args = $h.reverseArguments(arguments, 1),
			duration = args["integer"]|| 2000,
			icon = args["string"],
			config = args["object"] || {};
		
		//2.创建对应的element
		var innerHTML = "<p><label>" 
				+ (icon && ("<i class='" + icon + "'></i>") || "") 
				+ (text && ("<b>" + text + "</b>") || "") 
				+ "</label></p>";
		var divElement = $h.element("div", {id:"hui-toast", innerHTML:innerHTML});
		if(config.top){
			divElement.style.top = config.top + "px";
		}
		else if(config.bottom){
			divElement.style.bottom = config.bottom + "px";
		}
		if(config.zIndex){
			divElement.style.zIndex = config.zIndex;
		}
		document.body.appendChild(divElement);
		
		//N秒后开始显示关闭动画（透明度渐变，2000毫秒完成 ）
		setTimeout(function(){
			divElement.style.opacity = 0;
			//渐变动画结束后（1000毫秒），正式删除 div并通知promise对象resolve
			setTimeout(function(){
				document.body.removeChild(divElement);
				deferred.resolve();
			}, 1000);
		}, duration);

		return deferred.promise;
	}
	
	function _progressDialog(){
		var args = $h.reverseArguments(arguments),
			text = args["string"],
			config = args["object"] || {};
		
		//0.预处理，避免同时显示两个progressDialog引发的混乱情况
		if(document.getElementById("hui-progress-dialog")){
			return;
		}
		
		//1.创建对应的元素
		var inerHTML = "<p><label><i class='fa fa-repeat fa-spin'></i>" 
				+ (text && ("<b>" + text + "</b>") || "") + "</label></p>";
		var divElement = $h.element("div", {id:"hui-progress-dialog", innerHTML:inerHTML});
		if(config.zIndex){
			divElement.style.zIndex = config.zIndex;
		}
		//2.将元素附加在body上
		document.body.appendChild(divElement);
		
		//3.返回关闭progressDialog的钩子函数
		return function(){
			document.body.removeChild(divElement);
		};
	}
	
	function _progressBar(){
		
	}
	/**
	 * 支持以下几种调用方式
	 * $hui.alert("确定删除", "删除后数据无法恢复，请慎重操作", {confirmBtn:"确定删除"})
	 * $hui.alert("确定删除", "删除后数据无法恢复，请慎重操作")
	 */
	function _alert(title){
		var args = $h.reverseArguments(arguments, 1),
			description = args["string"],
			config = args["object"] || {};
		
		var deferred = $q.defer();
		
		var innerHTML = "<div><h4>" + title + "</h4>";
		if(description){
			innerHTML += "<p>" + description + "</p>";
		}
			
		innerHTML += "<button type='button' class='hui-btn-sea large'>" 
			+ (config.confirmBtn || "确定") + "</button></div>";
		var divElement = $h.element("div", {id:"hui-alert", innerHTML:innerHTML});
		var btnElement = divElement.getElementsByTagName("button")[0];
		btnElement.onclick = function(){
			document.body.removeChild(divElement);
			deferred.resolve();
		};
		
		if(config.zIndex){
			divElement.style.zIndex = config.zIndex;
		}
		
		document.body.appendChild(divElement);
		
		return deferred.promise;
	}
	
	/**
	 * 支持以下几种调用方式
	 * $hui.confirm("确定删除", "删除后数据无法恢复，请慎重操作", {confirmBtn:"确定删除", cancelBtn:"下次再说"})
	 * $hui.confirm("确定删除", {confirmBtn:"确定删除", cancelBtn:"下次再说"})
	 * $hui.confirm("确定删除", "删除后数据无法恢复，请慎重操作")
	 */
	function _confirm(title){
		var args = $h.reverseArguments(arguments, 1),
			description = args["string"],
			config = args["object"] || {};

		var deferred = $q.defer();
		
		var innerHTML = "<div><h4>" + title + "</h4>";
		if(description){
			innerHTML += "<p>" + description + "</p>";
		}
		innerHTML += "<button type='button' class='hui-btn-gray large'>" + (config.cancelBtn || "取消") + "</button>" 
			+ "<button type='button' class='hui-btn-fire large'>" + (config.confirmBtn || "确定") + "</button></div>";
		var divElement = $h.element("div", {id:"hui-confirm", innerHTML:innerHTML});
		var btnElements = divElement.getElementsByTagName("button");
		btnElements[0].onclick = function(){
			document.body.removeChild(divElement);
			deferred.reject();
		};
		
		btnElements[1].onclick = function(){
			document.body.removeChild(divElement);
			deferred.resolve();
		};
		
		if(config.zIndex){
			divElement.style.zIndex = config.zIndex;
		}
		
		document.body.appendChild(divElement);
		
		return deferred.promise;
	}
	

	
	/**
	 * arguments 1-3支持以下动态参数
	 * config:object
	 * pattern:regex
	 * error:错误提示
	 */
	function _prompt(title){
		var args = $h.reverseArguments(arguments, 1),
			description = args["string"],
			config = args["object"] || {},
			pattern = args["regex"];
	
		var deferred = $q.defer();
		
		var innerHTML = "<div><h4>" + title + "</h4>";
		if(description){
			innerHTML += "<p>" + description + "</p>";
		}
		innerHTML += "<textarea>" + (config.defaultValue || "") + "</textarea><span></span>"
			+ "<button type='button' class='hui-btn-gray large'>" + (config.cancelBtn || "取消") + "</button>" 
			+ "<button type='button' class='hui-btn-fire large'>" + (config.confirmBtn || "确定") + "</button></div>";
		var divElement = $h.element("div", {id:"hui-prompt", innerHTML:innerHTML});
		var btnElements = divElement.getElementsByTagName("button");
		btnElements[0].onclick = function(){
			document.body.removeChild(divElement);
			deferred.reject();
		};
		
		btnElements[1].onclick = function(){
			var textarea = divElement.getElementsByTagName("textarea")[0];
			var value = textarea.value;
			if(!value){
				//alert("请输入信息");
				divElement.getElementsByTagName("span")[0].innerHTML = 
				"<i class='fa fa-exclamation-triangle'></i>请输入信息";
				textarea.focus();
				return;
			}
			
			document.body.removeChild(divElement);
			deferred.resolve(value);
		};
		
		if(config.zIndex){
			divElement.style.zIndex = config.zIndex;
		}
		
		document.body.appendChild(divElement);
		
		return deferred.promise;
	}
}])

/**
 * myq add 2016-2-29，自定义与t_file表之间的upload/download/read image等操作的交互
 */
.factory("FileService", ["$q", "$http", function($q, $http){
	
	var fileUrl = $h.home() + "/files";
	var _fileExtensionMap = {
		word:["doc", "docx"], 
		excel:["xls", "xlsx"],
		pdf:["pdf"],
		zip:["zip", "rar", "7z"],
		image:["jpg", "jpeg", "jpe", "jfif", "png", "bmp", "dib", "gif", "tif", "tiff"],
		audio:["mp3", "wav", ""],
		video:["avi", "rmvb", "rm", "asf", "divx", "mpg", "mpeg", "mpe", "wmv", "mp4", "mkv", "vob","flv"]
	};
	
	var _fileTypeMap = {};
	for(var property in _fileExtensionMap){
		var fileExtensions = _fileExtensionMap[property];
		for(var i = 0; i < fileExtensions.length; i++){
			_fileTypeMap[fileExtensions[i]] = property;
		}
	}
		
	return {
		upload : _upload,
		getType : _getType,
		getAll : _getAll
	};
	
	function _upload(fileElement, data, headers){
		//var url = $h.home() + "/files";
		if(window.FormData){
			return xhrUpload(fileElement.files[0], fileUrl, data, headers);
		}
		else{
			return iframeUpload(fileElement, url, fileUrl, headers);
		}
	}
	
	function _getAll(ids){
		var url = fileUrl + "/list";
		ids.forEach(function(id, index){
			url += (index == 0 ? "?ids=" : "&ids=") + id; 
		});
		return $http.get(url);
	}
	
	//基于Html5 XMLHttpRequest2的无刷新上传代码，无法兼容恶心的ie6-9，适合chrome/safary和ie10+
	//本函数是在angular ui之 uploader组件中的ajaxUpload函数基础上的精简版，原代码地址如下
	//为 https://github.com/angular-ui/ui-uploader/blob/master/src/uploader.js
		function xhrUpload(file, url, data, headers) {
			var deferred = $q.defer();
			
			//0.预处理
				var xhr = new window.XMLHttpRequest(), 
					formData = new window.FormData(), 
					key = 'file';
				
				// Append additional data if provided:
				
				if (data) {
						for (var prop in data) {
								if (data.hasOwnProperty(prop)) {
										formData.append(prop, data[prop]);
								}
						}
				}
				// Append file data:
				formData.append(key, file, file.name);
				
				if (headers) {
						for (var headerKey in headers) {
								if (headers.hasOwnProperty(headerKey)) {
										xhr.setRequestHeader(headerKey, headers[headerKey]);
								}
						}
				}
				

				// To account for sites that may require CORS
				if (data && data.withCredentials === true) {
						xhr.withCredentials = true;
				}
				xhr.open('POST', url);

			 
				//1.设置各类回调函数
				// Triggered when upload starts:
				xhr.upload.onloadstart = function() {
				};

				// Triggered many times during upload:
				xhr.upload.onprogress = function(ev) {
					deferred.notify(file, ev);
				};

				// Triggered when upload is completed:
				xhr.onload = function() {
					var rsp = JSON.parse(xhr.responseText);
					deferred.resolve(rsp, file , xhr.status);
				};

				// Triggered when upload fails:
				xhr.onerror = function(ev) {
					deferred.reject(ev);
				};

				//2.开始上传文件了
				xhr.send(formData);

				//final. 返回promise对象
				return deferred.promise;
		}
		
		//依赖jquery上传
		function iframeUpload(fileElement, url){
			var deferred = $q.defer();
			
			HUI_FILE_ELEMENT_INDEX = HUI_FILE_ELEMENT_INDEX || 0;
			if(!fileElement.id){
				fileElement.id = "hui-file-" + HUI_FILE_ELEMENT_INDEX++;
			}
			$.ajaxFileUpload({
				url : url,
				secureuri : false,
				fileElementId : fileElement.id,
				data : {op : "upload"},
				dataType : "json",
				success : function(data, status) {
					if (!data.error){
						deferred.resolve();
					}
					else{
						deferred.reject(data.error);
					}
				},
				error : function(data, status, e) {
					deferred.reject(data);
				}
			});
			
			return deferred.promise;
		}
		
	//0.设置fileType处理逻辑

	
	function _getType(fileName){
		//var fileName = file.fileName;
		var pos = fileName.lastIndexOf(".");
		if(pos < 0){
			return "none";
		}
		else{
			var fileExtension = fileName.substring(pos + 1).toLowerCase();
			return _fileTypeMap[fileExtension] || "unknown";
		}
	}
}])

.directive('huiFiles', ["FileService", "$timeout", "$hui", "$q", 
function(FileService, $timeout, $hui, $q) {
	return {
		restrict : 'A',
		scope : {
			model : '=',
			fileType : "@",
			fileExts : "@",
			maxSize : "@",
			minSize : "@",
			maxCount : "@"
		},
		template : '<div class="hui-files">'
				 + '	<div class="file" ng-repeat="file in files" ng-init="fileType = getFileType(file.fileName)">'
				 + '		<s class="{{fileType}}"><img ng-if="fileType == \'image\'" ng-src="' + $h.home() + '/images/{{file.id}}?w=100&h=100" /></s>'
				 + '		<a ng-href="' + $h.home() + '/files/{{file.id}}" target="_blank">{{file.fileName}}</a>'
				 + '		<i class="fa fa-angle-left" ng-click="rise($index)" ng-if="!readonly && files.length > 1"></i>'
				 + '		<i class="fa fa-angle-right" ng-click="drop($index)" ng-if="!readonly && files.length > 1"></i>'
				 + '		<i class="fa fa fa-download" ng-click="download($index)"></i>'
				 + '		<i class="fa fa fa-trash-o" ng-click="remove($index)" ng-if="!readonly"></i>'
				 + '	</div>'
				 + '	<div class="uploading" ng-if="uploading" ng-if="!readonly">'
				 + '		<i class="fa fa-circle-o-notch fa-spin"></i>'
				 + '		<p>上传文件中</p>'
				 + '	</div>'
				 + '	<div class="add" ng-if="!readonly && allowUpload() && !uploading">'
				 + '		<i>+</i>'
				 + '		<input type="file" name="fileUpload" onchange="angular.element(this).scope().upload(this)">'
				 + '	</div>	'
				 + '</div>',
		link : function(scope, iElement, iAttrs) {
			//初始化scope的各项参数
			scope.maxCount = scope.maxCount ? parseInt(scope.maxCount) : 10;
			scope.readonly = iAttrs.hasOwnProperty("readonly");
			
			var actionPath = $h.home() + "/file.do";
			//1.设置文件数量、大小、图片等限制条件
			
			//scope.readonly = config.readonly || false;
			var closeWatch = scope.$watch("model", function(newValue){
				if(scope.files){
					closeWatch();//已经同步过了，关闭监听器，不再继续监听
				}
				else if(newValue){
					closeWatch();
					var fileIds = $h.isInt(newValue) ? [newValue] : newValue.split(",");
					FileService.getAll(fileIds)
					.success(function(rsp){
						if(!rsp.error){
							scope.files = rsp || [];
							scope.resetFileIds();
						}
					});
				}
			});
			
			
			//给隐藏的file元素加上Onchange事件，使得选择本地文件后立即启动上传操作
			scope.upload = function(fileElement){
				//1.获得上传文件信息
				//ev = ev || event;
				if(scope.uploading){
					return;
				}
				
				//var fileElement = $event.target;
				scope.uploading = true;
				$q.when()
				//1.上传文件的扩展名、大小检查
				.then(function(){
					if(window.FormData){//现代浏览器
						var file = fileElement.files[0];
						return scope.fileType && getFileType(file.name) != scope.fileType 
									&& $q.reject("扩展名应当为 " + getFileExtensions(scope.fileType).join("/") + " 中的一种")
							|| scope.maxSize && file.size > scope.maxSize
									&& $q.reject( "文件大小不能超过" + scope.maxSize)
							|| scope.minSize && file.size < scope.minSize
									&& $q.reject("文件大小不能低于" + scope.minSize);
					}
					else{//土鳖的ie6-9，无法监测文件大小，只能先前端核对一下文件类型了
						return scope.fileType && getFileType(fileElement.value) != scope.fileType
									&& $q.reject("扩展名应当为 " + getFileExtensions(scope.fileType).join("/") + " 中的一种");
					}
				})
				//2.对有效的文件，调用fileService进行上传；对无效的文件，告知具体的错误原因
				.then(function(){
					return FileService.upload(fileElement)
				}, function(reason){
					$hui.alert("请选择正确的文件", reason);
					return $q.reject();
				})
				//3.接收处理上传结果
				.then(function(rsp, file, status){//resolved, file upload success!
					scope.uploading = false;
					if(rsp.error){
						$hui.alert("文件上传失败", rsp.error);
					}
					else{
						scope.files = scope.files || [];
						scope.files.push(rsp);
						scope.resetFileIds();
					}
				}, function(reason){
					reason && $hui.alert(reason.error || reason);
				})
				//final.清除上传状态
				["finally"](function(){
					scope.uploading = false;
				});
			};
			
			scope.allowUpload = function(){
				
				var fileCount = scope.files ? scope.files.length : 0;
				if(scope.uploading){
					fileCount += 1;//正在上传的，也要占一个名额
				}
				return fileCount < scope.maxCount;
			};
			
			//3.2 删除
			scope.remove = function(index){
				var file = scope.files[index];
				$hui.confirm("确认删除文件", file.fileName)
				.then(function(){
					scope.files.splice(index, 1);
					scope.resetFileIds();
				});
			};
			
			//3.1 下载文件
			scope.download = function(index){
				var file = scope.files[index];
				var url = "/" + $h.appName + "/files/" + file.id;
				window.open(url);
			};
			
			//3.3上升一个排名
			scope.rise = function(index){
				//var index = files.indexOf(file);
				if(index > 0){
					var files = scope.files,
						from = index, 
						to = index - 1,
						copy = angular.copy(files[from]);
					
					files[from] = angular.copy(files[to]);
					files[to] = copy;
					scope.resetFileIds();
				}
			};
			
			//3.4 下降一个排名
			scope.drop = function(index){
				var files = scope.files;
				//var index = this.files.indexOf(row);
				if(index < files.length - 1){
					var files = scope.files,
						from = index, 
						to = index + 1,
						copy = angular.copy(files[from]);
					
					files[from] = angular.copy(files[to]);
					files[to] = copy;
					scope.resetFileIds();
				}
			};
			
			
			scope.resetFileIds = function(){
				var fileIds = [];
				scope.files.forEach(function(item){
					fileIds.push(item.id);
				});
				scope.model = fileIds.join(",");
			};
			
			scope.getFileType = function(fileName){
				return FileService.getType(fileName);
			};
			
			scope.fileSrc = function(text){
					//text可能是一个数字，如1/2,3，也可能是这样的"1,2,3"文本（代表有多个图片），只显示第一个
					if(text){
						var fileId = text.split(",")[0];
						return $h.home() + "/files/" + fileId;
					}
				};
		}
	};
}])

.directive("huiUeditor", [
	function() {
		return {
			restrict: "A",
			require: "ngModel",
			scope: {
				config: "=",
				ready: "=",
				textModel:"="
			},
			link: function(scope, element, attr, ctrl) {
				var _NGUeditor, _updateByRender;
				_updateByRender = false;
				_NGUeditor = (function() {
					function _NGUeditor() {
						this.bindRender();
						this.initEditor();
						return;
					}


					/**
					 * 初始化编辑器
					 * @return {[type]} [description]
					 */

					_NGUeditor.prototype.initEditor = function() {
						var _UEConfig, _editorId, _self;
						_self = this;
						if (typeof UE === 'undefined') {
							console.error("Please import the local resources of ueditor!");
							return;
						}
						_UEConfig = scope.config ? scope.config : {};
						//_UEConfig = attr.config && scope.$eval(attr.config) || {};
						_editorId = attr.id ? attr.id : "_editor" + (Date.now());
						element[0].id = _editorId;
						this.editor = new UE.ui.Editor(_UEConfig);
						this.editor.render(_editorId);
						return this.editor.ready(function() {
							_self.editorReady = true;
							_self.editor.addListener("contentChange", function() {
								ctrl.$setViewValue(_self.editor.getContent());
								
								//myq add 2016-6-4,当ueditor数值发生变化时，修改对应的text字段
								if(element[0].hasAttribute("text-model")){
									var contentText = _self.editor.getContentTxt();
									scope.textModel = contentText;
								}
								
								if (!_updateByRender) {
									if (!scope.$$phase) {
										scope.$apply();
									}
								}
								_updateByRender = false;
							});
							if (_self.modelContent && _self.modelContent.length > 0) {
								_self.setEditorContent();
							}
							if (typeof scope.ready === "function") {
								scope.ready(_self.editor);
							}
							scope.$on("$destroy", function() {
								if (!attr.id && UE.delEditor) {
									UE.delEditor(_editorId);
								}
							});
						});
					};

					_NGUeditor.prototype.setEditorContent = function(content) {
						if (content == null) {
							content = this.modelContent;
						}
						if (this.editor && this.editorReady) {
							this.editor.setContent(content);
						}
					};

					_NGUeditor.prototype.bindRender = function() {
						var _self;
						_self = this;
						ctrl.$render = function() {
							_self.modelContent = (ctrl.$isEmpty(ctrl.$viewValue) ? "" : ctrl.$viewValue);
							_updateByRender = true;
							_self.setEditorContent();
						};
					};

					return _NGUeditor;

				})();
				new _NGUeditor();
			}
		};
	}
])

