$h.appName = "gift12345";
$h.extendsApiHttp = function(app, anonymousErrorCode, anonymousErrorFn){
	app
	.factory('httpInterceptor', ['$log', "$hui", "$q",
    function($log, $hui, $q){
    	$log.debug('$http inspector');
    	
    	return {
    		request : _request,
    		response : _response
    	};
    	
    	function _request(config){
    		if(config.url.indexOf("/api/") > 0){
    			console.log("[req." + config.method + "]" + config.url);
    			var data = config.data;
    			if(data){
    				console.log("\tpost data = " + JSON.stringify(data));
    			}
    		}
    		return config;
    	}
    	
    	function _response(response){
    		var config = response.config;
    		
    		if(config.url.indexOf("/api/") > 0){
    			var data = response.data;
    			var config = response.config;
    			console.log("[rsp." + config.method + "]" + config.url + "\n\t return data = " + JSON.stringify(data));
    			if(data && data.error){
    				//if(data.code == "console.auth.user.anonymous"){
    				if(data.code == anonymousErrorCode){
    					$hui.toast("请重新登陆")
    					.then(function(){
    						anonymousErrorFn && anonymousErrorFn();
    					});	
    					// 终止后面的处理链，直接切到对应的登陆页面去了
    					throw "unknown user apply, return to login page";
    				}
    				else{
    					//其他错误，还是留给具体的业务逻辑去处理吧
    				}
    			}
    			//myq add 2016.9.29，提取服务器时间，并存储
    			var serviceTime = response.headers("Server-Now"); 
    			$h && $h.time && $h.time.service(serviceTime);
    		}
    		
    		return response;
    	}
    }])
    .config(['$httpProvider', function($httpProvider){
    	$httpProvider.interceptors.push('httpInterceptor');
    }]);
};

$h.extendRootScope = function(app){
	app.run(["$rootScope", "$state", "$stateParams", "$hui", "$q", "$filter",
	function($rootScope, $state, $stateParams, $hui, $q, $filter) {
		// 2.1 把路由相关的服务挂在顶层scope中，避免其他controller每次使用前都要注入
	    $rootScope.$state = $state;
	    $rootScope.$stateParams = $stateParams;
	    
	    // 2.2定义通用的方法，包括获取图片路径、权限控制等
	    $rootScope.img = function(target, width, height){
	    	// text可能是一个数字，如1/2,3，也可能是这样的"1,2,3"文本（代表有多个图片），只显示第一个
	    	var id = angular.isNumber(target) && target || angular.isString(target) && target.split(",")[0] || null;
	    	if(id){
	    		var src = $h.home() + "/images/" + id;
	    		if(width && height){
	    			src += "?w=" + width + "&h=" + height;
	    		}
	    		return src;
	    	}
	    };
	    
	    $rootScope.imgSrc = $rootScope.img;
	    
	    $rootScope.fileSrc = function(text){
	    	var id = angular.isNumber(target) && target || angular.isString(target) && target.split(",")[0] || null;
	    	if(id){
	    		return $h.home() + "/files/" + fileId;
	    	}
	    };
	    
	    //仿照oracle的decode函数，decode(条件,值1,返回值1,值2,返回值2,...值n,返回值n,缺省值) 
	    $rootScope.decode = function(target){
	    	//var count =  Math.ceil((arguments.length - 1) / 2);
	    	for(var i = 1; i < arguments.length - 1; i = i + 2){
	    		var key = arguments[i];
	    		if(key === target){
	    			return arguments[i + 1];
	    		}
	    	}
	    	//default value
	    	if(i == arguments.length - 1){
	    		return arguments[i];
	    	}
	    };
	    
	    //myq add 2016-4-6，接收下级scope提交的广播请求，协助其发送给其他兄弟子域
	    $rootScope.$on("hui-root-broadcast-submit", function(ev, data){
	    	console.log("get broadcast apply from child scope\n" + JSON.stringify(data));
	    	$rootScope.$broadcast("hui-root-broadcast-send", data);
	    });
	    
	    //由子域调用，所以用this而不是$rootScope
	    $rootScope.report = function(action, params){
	    	this.$emit("hui-root-broadcast-submit", {action:action, params:params});
	    };
	    
	    $rootScope.listen = function(action, fn){
	    	this.$on("hui-root-broadcast-send", function(ev, data){
	    		if(data.action == action){
	    			var params = data.params;
	    			fn(ev, params);
	    		}
	    	});
	    	//myq add 2016-6-7，对子域发起的广播，提前获取，
	    	this.$on("hui-root-broadcast-submit", function(ev, data){
	    		if(data.action == action){
	    			var params = data.params;
	    			fn(ev, params);
	    		}
	    	});
	    };
	    
	    //myq add 2016-6-9，采用promise模式进行验证 
	    $rootScope.validateForm = function(){
	    	$scope = this;
	    	// 1.有效性验证
	    	var errorElements = document.querySelectorAll("p.hui-validate-error");
	    	var errorCount = errorElements.length;
	    	if (errorCount) {
	    		$scope.$broadcast("hui-validate-error-show");
    			errorElements[0].scrollIntoView();
    			return $q.reject("共有" + errorCount + "项内容填写错误");
	    	}
	    	return $q.when();
	    };
	    
	    $rootScope.home = function(){
	    	return $h.home();
	    };
	    
	    $rootScope.arrayUp = function(array, $index){	
			if($index > 0){
				$h.array.exchange(array, $index, $index - 1);
			}
		};
		
		//排名下移一位 
		$rootScope.arrayDown = function(array, $index){
			if($index < array.length - 1){
				$h.array.exchange(array, $index, $index + 1);
			}
		};
		
		$rootScope.arrayAdd = function(array, $index, row){
			array.splice($index, 0, row);
		};
		
		$rootScope.arrayDelete = function(array, $index, confirmText, confirmDetail){
			$q.when(confirmText && $hui.confirm(confirmText, confirmDetail))
			.then(function(){
				array.splice($index, 1);
			});
		};
		
		angular.finiteWatch = function(scope, expression, whenFn){
			_finiteWatch(scope, expression, whenFn);
		}
		
		function _finiteWatch($scope, expression, whenFn){
			var closeWatchFn = $scope.$watch(expression, function(){
				var closeWatch = whenFn.apply(null, arguments);
				if(closeWatch){
					closeWatchFn();
					closeWatchFn = null;
				}
			});
		}
		
		$rootScope.showHuiValidateError = function(model){
			$scope = this;
			var config = model ?  {model:model} : {};
			$scope.$broadcast("hui-validate-error-show", config);
		}
		
		$rootScope.createOptions = (function(){
			var cache = {};
			return function(start, end, textExpression){
				var key = start + "." + "end." + textExpression;
				var options = cache[key];
				if(!options){
					var options = [];
					for(var i = start; i <= end; i++){
						if(angular.isString(textExpression)){
							var text = textExpression.replace("$", i);
							options.push({v:i, t:text});
						}
						else{
							options.push(i);
						}	
					}
					cache[key] = options;
				}
				return options;
			}
		})();
		
		$rootScope.serviceDate = function(){
			var serviceTime = $h.time.service();
			return serviceTime && $filter("date")(serviceTime, "yyyy-MM-dd");
		}
			
		$rootScope.letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
		
	}]);
};
