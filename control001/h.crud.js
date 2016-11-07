/**
 * myq add 2016-2-10，定义增删改查的通用service、controller以及自定义组件 
 */

angular.module("h.crud", [])
.factory("$crud", ["$http", "$q", "$templateRequest", "$rootScope", "$compile",
function($http, $q, $templateRequest, $rootScope, $compile){
	return function(apiBaseUri, routers){
		return service = {
			routers : angular.copy(routers),
			getApiUri : _getApiUri,//获取基本的api uri路径
			add : _add,//调用add restfull api，向服务器端发起新增操作
			remove : _remove,//删除，delete在ie中是保留字
			update : _update,
			get : _get,
			getAll : _getAll,
			view : _get,
			create : _create,//从服务器端加载一个空白的bean，主要是为了获得各项默认值
			query : _query,
			refresh : _refresh,
			getTrees : _getTrees,//把所有的实体数据，按照id、parentId、seq的关系组织成树，返回TreeData数组
			getPairs : _getPairs,//把所有的实体数组，组装成key,value结构的数组并返回
			validateUnique : _validateUnique,//验证某个属性是否唯一
			exchangeSeq : _exchangeSeq,//对换顺序
			enable : _toggleStatusFn("enable"),//将状态从0切换到1
			disable : _toggleStatusFn("disable"),//将状态从1切换回0
			reject : _toggleStatusFn("reject"),//将状态从0切换为9
			submit : _toggleStatusFn("submit"),//将状态从9切换为0
			recover : _toggleStatusFn("recover"),//将状态从-1切换为0
			selectMultiple : _selectMultiple,
			select : _select,
			request : _request,
		};
		
		/**
		 * 这里采用可变参数，接收以下两个参数
		 * path:string类型，如"/list"、"/search/more"等
		 * search:object类型，用于设定search条件的key-value关系，如{x:1, y:2}
		 */
		function _getApiUri(){
			var args = $h.reverseArguments(arguments, 0),
				path = args["string"] || args["integer"],
				search = args["object"];
			
			var uri = $h.home() + apiBaseUri;
			if(typeof(path) == "string"){
				if(path.indexOf("http") == 0){
					uri = path;//绝对路径
				}
				else{//相对路径
					uri += path[0] == "/" ? path : "/" + path;
				}
			}
			else if(path || path === 0 || path === false){
				uri += "/" + path;
			}
			
			if(search){
				var array = [];
				for(var k in search){
					var v = search[k];
					if(!v && v !== 0){
						continue;
					}
					if(angular.isArray(v)){
						v.forEach(function(value){
							array.push(k + "=" + value);
						})
					}
					else if(v || v === 0){
						array.push(k + "=" + v);
					}
				}
				if(array.length){
					uri += "?" + array.join("&");
				}
			}
			return uri;
		}
		
		function _request(apiParam, method, postData){
			if(!angular.isArray(apiParam)){
				apiParam = [apiParam];
			}
			var apiUri = _getApiUri.apply(this, apiParam);
	
			return $http[method](apiUri, postData)
				.then(function(rsp){//ajax.success
					return rsp.data.error && $q.reject(rsp.data) || rsp.data; 
				}, function(rsp){//ajax.error
					return $q.reject("网络连接异常，请稍候再试");
				})
		}
		
		function _add(bean){
			return _request(null, "post", bean);
		}
		
		function _remove(id){
			return _request(id, "delete");
		}
		
		//myq modified 2016-8-14, config中包含对应的props字段，用于只返回部分字段
		function _get(id, config){
			return _request([id, config], "get");
		}
		
		function _getAll(filter){
			return _request(filter, "get");
		}
		
		function _create(params){
			return _request(["new", params], "get");
		}
		
		function _update(bean){
			return _request(bean.id, "put", bean);
		}
		
		function _query(filter, pn, ps){
			var params = { pn : pn || 1, ps : ps || 10,
				filter : encodeURIComponent(angular.toJson(filter || {}))};
			return _request(params, "get");
		}
		
		function _refresh(params){
			return _request(["refresh", params], "post");
		}
		
		function _getTrees(filter){
			return _request(["trees", filter], "get");
		}
		
		function _getPairs(filter){
			return _request(["pairs", filter], "get");
		}
		
		function _validateUnique(propName, propValue, excludeId){
			var params = {value : propValue};
			if(excludeId){
				params.excludeId = excludeId;
			}
			return _request(["unique/" + propName, params], "get");
		}
		
		function _exchangeSeq(fromId, toId){
			var params = {fromId:fromId, toId:toId};
			return _request(["seq", params], "post");
		}
		
		//返回一个通用的Fuction，避免之前大量的复制 _enable/_disable/_submit等函数
		function _toggleStatusFn(action){
			return function(id, postData){
				return _request(id + "/" + action, "post", postData);
			}
		}
		
		//打开一个新窗口，选择1个数据，promise方式返回
		function _select(filter, ignoreIds, callBackFn){
			var element, scope;
			//1.加载模板，创建dom元素 tpl/shop-select-multiple.html
			var tplName = routers.selectTpl;
			$templateRequest(tplName)
			.then(function(rsp){
				element = angular.element("<div class='hui-modal'></div>")[0];
				element.innerHTML = rsp;
			}, function(rsp){
				return $q.reject("模板文件不存在:" + tplName)
			})
			//final
			.then(function(){
				scope = $rootScope.$new();
				scope.confirm = _confirm;
				scope.close = _close;
				scope.filter = filter || {};
				scope.ignoreIds = ignoreIds || [];
				scope.query = _query;
				scope.forwardPage = _forwardPage;
				document.body.appendChild(element);
				$compile(element)(scope);
				
				callBackFn && callBackFn(scope);
			}, function(reason){
				reason && $hui.toast(reason.error || reason);
			})
			
			//4.创建并返回关联的promise对象
			var self = this;
			var deferred = $q.defer();
			return deferred.promise;
			
			function _confirm(row){
				deferred.resolve(angular.copy(row));
	        	element.remove();
		        scope.$destroy();
			}
			
			function _close(){
				//暂时不考虑缓存数据，一次性销毁临时生成的element，scope等 ，避免内存泄漏
				element.remove();
		        scope.$destroy();
				deferred.reject();
			}
			
			function _query(pn){
				pn = pn || 1;
				self.query(scope.filter, pn, 5)
				.then(function(result){
					scope.result = result;
					if(result.rows){
						var ignoreIds = scope.ignoreIds;
						result.rows.forEach(function(row){
							row.disabled = ignoreIds.indexOf(row.id) >= 0;
						});
					}
				}, function(reason){
					reason && $hui.toast(reason.error || reason);
				})
			}
			
			function _forwardPage(pn){
				_query(pn);
			}
		}
		
		//打开一个新窗口，选择多个数据，promise方式返回
		function _selectMultiple(filter, ignoreIds){
			var element, scope;
			
			//1.加载模板，创建dom元素 tpl/shop-select-multiple.html
			var tplName = routers.selectMultipleTpl;
			$templateRequest(tplName)
			.then(function(rsp){
				element = angular.element("<div class='hui-modal'></div>")[0];
				element.innerHTML = rsp;
			}, function(rsp){
				return $q.reject("模板文件不存在:" + tplName)
			})
			//final
			.then(function(){
				scope = $rootScope.$new();
				scope.confirm = _confirm;
				scope.close = _close;
				scope.filter = filter || {};
				scope.ignoreIds = ignoreIds || [];
				scope.query = _query;
				scope.forwardPage = _forwardPage;
				scope.toggleChecked = _toggleChecked;
				document.body.appendChild(element);
				$compile(element)(scope);
				
			}, function(reason){
				reason && $hui.toast(reason.error || reason);
			})
			
			//4.创建并返回关联的promise对象
			var self = this;
			var deferred = $q.defer();
			return deferred.promise;
			
			function _confirm(){
				//暂时不考虑缓存数据，一次性销毁临时生成的element，scope等 ，避免内存泄漏
				
				var ids = [];
		        var rows = [];
		        scope.result.rows.forEach(function(row){
		        	if(row.checked){
		        		ids.push(row.id);
		        		rows.push(angular.copy(row));
		        	}
		        });
		        
		        if(ids.length){
		        	deferred.resolve({ids:ids, rows:rows});
		        	element.remove();
			        scope.$destroy();
		        }
		        else{
		        	$hui.toast("请选择", {zIndex:1000});
		        }
			}
			
			function _close(){
				//暂时不考虑缓存数据，一次性销毁临时生成的element，scope等 ，避免内存泄漏
				element.remove();
		        scope.$destroy();
				deferred.reject();
			}
			
			function _query(pn){
				pn = pn || 1;
				self.query(scope.filter, pn, 5)
				.then(function(result){
					scope.result = result;
					if(result.rows){
						var ignoreIds = scope.ignoreIds;
						result.rows.forEach(function(row){
							row.disabled = ignoreIds.indexOf(row.id) >= 0;
						});
					}
				}, function(reason){
					reason && $hui.toast(reason.error || reason);
				})
			}
			
			function _forwardPage(pn){
				_query(pn);
			}
			
			function _toggleChecked(row){
				if(row){
					if(row.checked){
						scope.result.checked = scope.result.rows.every(function(row){
							return row.disabled || !!row.checked;
						});
					}
					else{
						scope.result.checked = false;
					}
				}
				else{
					var checked = !!scope.result.checked;
					scope.result.rows.forEach(function(row){
						if(!row.disabled){
							row.checked = checked;
						}
						
					});
				}
			}
		}
	}
}])


/**
 * 
 * declare base crud controlelr builder
 * 
 */
.factory("CrudBuilder", ["$http", "$location", "$hui", "$q", 
function($http, $location, $hui, $q){
	return {buildListScope : _buildListScope, 
		buildEditScope : _buildEditScope,
		buildViewScope : _buildViewScope,
		buildTreeScope : _buildTreeScope,
		buildTreeNodeScope : _buildTreeNodeScope
	}
	
	//Part 1, 初始化查询页面的通用controller
	function _buildListScope($scope, crudService, routers, config){
		routers = routers || crudService.routers;
		var $stateParams = $scope.$stateParams;
		var $state = $scope.$state;
		var idName = config && config.paramId || "id";
		
		//1.1.绑定查询条件/页码/每页数据量等
		var filterText = $stateParams.filter;
		$scope.filter = filterText && JSON.parse(filterText) || {};
		var promise = _query();
		
		//2.1.响应对对顶部的“查询”按钮的点击事件，实际上是切换到另外一个单页，这样的目的是为了实现返回按钮。
		$scope.query = function(){
			var filter = angular.copy($scope.filter);
			var emptyKeys = [];
			for(var key in filter){
				var value = filter[key];
				if(value === "" || value === null){
					emptyKeys.push(key);
				}
			}
			for(var i = 0; i < emptyKeys.length; i++){
				delete filter[emptyKeys[i]];
			}
			
			var filterText = angular.toJson(filter);
			var params = filterText == "{}" ? {} : {"filter":filterText};
			if($stateParams.filter == params.filter && !$stateParams.pn){
				_query();
			}
			else{
				$location.search(params);
			}
			
		}
		
		//2.2 点击“编辑”按钮之后的响应操作，只是把url切换到编辑页面而已
		$scope.edit = function(target){
			var params = {};
			params[idName] = target.id || target;
			//myq modify@2016-6-11，支持采用默认路由（默认发起操作的路由格式为  xxx-list）
			var stateName = routers && routers.edit 
				|| $scope.$state.current.name.replace(/-list$/, "-edit");
			$state.go(stateName, params);//强制启动ui-router进行url切换
		}
		
		//2.3 点击“查看”按钮之后的响应操作，只是把url切换到查看页面而已
		$scope.view = function(target){
			var params = {};
			params[idName] = target.id || target;
			var stateName = routers && routers.view 
				|| $scope.$state.current.name.replace(/-list$/, "-view");
			$state.go(stateName, params);//强制启动ui-router进行url切换
		}
		
		//2.4 点击“新增”按钮之后的响应操作，只是把url切换到编辑页面而已
		$scope.add = function(params){
			var stateName = routers && routers.add 
				|| $scope.$state.current.name.replace(/-list$/, "-add");
			$state.go(stateName, params);//强制启动ui-router进行url切换
		}
		
		//2.5定义各类相似操作
		$scope.remove = _operateFn("确定删除数据？", "remove");
		$scope.recover = _operateFn("确定恢复数据？", "recover");
		$scope.enable = _operateFn("确定发布数据？", "enable");
		$scope.reject = _operateFn("确定驳回数据？", "reject");
		$scope.disable = _operateFn("确定停用数据？", "disable");
		$scope.submit = _operateFn("确定提交审核？", "submit");
		
		function _operateFn(defaultTitle, fnName){
			return function(target, title, description){
				title = title || defaultTitle;
				
				$hui.confirm(title, description)
				.then(function(){//发起操作
					var id = target.id || target;
					return crudService[fnName](id);
				})
				
				//告知结果
				.then(function(rsp){
					return $hui.toast("操作成功");
				})

				//final.
				.then(function(){//resolve
					_query();
				}, function(reason){//reject
					if(reason){
						$hui.toast(reason.error || reason);
					}
				});
			}
		}
		
		function _query(){
			$scope.result = null;
			
			var promise = crudService.query($scope.filter, $stateParams.pn, $stateParams.ps)
				.then(function(result){//final resolve
					$scope.result = result;
				}, function(reason){//reject
					if(reason){
						$hui.toast(reason.error || reason);
					}
				});
			return promise;
		}
		
		return promise;
	}
	
	//Part 2，初始化新增/编辑页面的controller
	function _buildEditScope($scope, crudService, routers, config){
		routers = routers || crudService.routers;
		var $stateParams = $scope.$stateParams;
		var $state = $scope.$state;
		var idName = config && config.paramId || "id";
		var id = $stateParams[idName];
		$scope.bean = {};
		
		//2.1.load sysuser bean or create one!
		var promise = (id && crudService.get(id) || crudService.create($stateParams))
		//final.
		.then(function(bean){//final resolve
			$scope.bean = bean;
			return bean;
		}, function(reason){//reject
			if(reason){
				$hui.toast(reason.error || reason);
			}
			return $q.reject(reason);
		})

		
		//2.2.declare save action。customFn，自定义的保存行为
		$scope.save = function($event, customFn){
			//防止重复点击save按钮
			var btnElement = $event.srcElement;
			if(btnElement.disabled){
				return;
			}
			
			var isNew = !$scope.bean.id;
			$q.when()
			//1.表单输入有效性验证
			.then(function(){
				return $scope.validateForm();
			})
			//2.封装需要提交保存的bean对象
			.then(function(){
				btnElement.disabled = "disabled";
				var bean = angular.copy($scope.bean);
				return bean;
			})
			//3.发起http insert/update请求
			.then(customFn || function(bean){
				return crudService[isNew && "add" || "update"](bean);
			})	
			//final.
			.then(function(bean){//final resolve
				//如果需要广播，则发送
				config && config.broadcast && $scope.report($state.current.name, bean);
				history.back();
			}, function(reason){//reject
				btnElement.disabled = null;
				reason && $hui.toast(reason.error || reason);
			});
		}
		
		return promise;
	}
	
	//Part 3，初始化视图页面的controller
	function _buildViewScope($scope, crudService, routers){
		routers = routers || crudService.routers;
		var $stateParams = $scope.$stateParams;
		var $state = $scope.$state;
		var id = $stateParams.id;
		$scope.bean = {};
		//2.1.load sysuser bean or create one!
		var promise = 
			crudService.get(id)
			.then(function(bean){
				$scope.bean = bean;
			}, function(reason){//reject
				$hui.toast(reason);
				if(angular.isString(reason)){
					$hui.toast(reason);
				}
				else if(reason.error){
					$hui.toast(reason.error);
				}
			})
		
		
		//2.5定义各类相似操作
		$scope.remove = _operateFn("确定删除数据？", "remove");
		$scope.recover = _operateFn("确定恢复数据？", "recover");
		$scope.enable = _operateFn("确定发布数据？", "enable");
		$scope.reject = _operateFn("确定驳回数据？", "reject");
		$scope.disable = _operateFn("确定停用数据？", "disable");
		$scope.submit = _operateFn("确定提交审核？", "submit");
		
		function _operateFn(defaultTitle, fnName){
			return function($event, title, description){
				var btnElement = $event.srcElement;
				if(btnElement.disabled){
					return;
				}
				
				title = title || defaultTitle;
				btnElement.disabled = true;
				$hui.confirm(title, description)
				.then(function(){//发起操作
					var id = $scope.bean.id;
					return crudService[fnName](id);
				})
				
				//告知结果
				.then(function(rsp){
					return $hui.toast("操作成功");
				})

				//final.
				.then(function(){//resolve
					window.location.reload();
				}, function(reason){//reject
					reason && $hui.toast(reason.error || reason);
					btnElement.disabled = false;
				});
			}
		}
				
		
		return promise;
	}
	
	//Part4.1 初始化Tree页面的scope
	function _buildTreeScope($scope, crudService, routers){
		routers = routers || crudService.routers;
		var $stateParams = $scope.$stateParams;
		var $state = $scope.$state;
		
		//1.调用service,完成controller的初始化
		var promise = crudService.getTrees()
			.then(function(nodes){
				$scope.nodes = nodes;
			});
		
		//2.处理TreeNode子域发起的新增、修改节点的请求，打开对应的操作界面，config有两种形式：
		//  A.新增下级节点 config={parentId:XXX}
		//  B.新增兄弟节点 config={siblingId:XXXX}
		//  注意：TreeData结构为 {bean:{...}, childs:[....]}
		var stateName = routers && routers.edit || $scope.$state.current.name + ".edit";
		$scope.listen(stateName, function($event, bean){
			if($event.stopPropagation){
				$event.stopPropagation();
			}
			
			var id = bean.id;
			var node = getNode($scope.nodes, id);
			node.bean = bean;
		});
		
		var stateName = routers && routers.add || $scope.$state.current.name + ".add";
		$scope.listen(stateName, function($event, bean){
			if($event.stopPropagation){
				$event.stopPropagation();
			}
			var parentNode = getNode($scope.nodes, bean.parentId);
			var childNodes = parentNode ? parentNode.childs : $scope.nodes;
			if(bean.siblingId){
				for(var i = 0; i < childNodes.length; i++){
					if(childNodes[i].bean.id == bean.siblingId){
						childNodes.splice(i + 1, 0, {"bean":bean, childs:[]});
						return;
					}
				}
			}
			else{
				childNodes.push({"bean" : bean, childs:[]});
			}
		})
		
		function getNode(nodes, id){
			if(!nodes || nodes.length == 0){
				return
			}
			
			for(var i = 0; i < nodes.length; i++){
				var node = nodes[i];
				if(node.bean.id == id){
					return node;
				}
				var childNode = getNode(node.childs, id);
				if(childNode){
					return childNode;
				}
			}
		}
		
		//新增第一个tree node对象 
		$scope.add = function(){
			var stateName = routers && routers.add || $scope.$state.current.name + ".add";
			$scope.$state.go(stateName, {level:1});
		}
		
		return promise;
	}

	//Part4.1 初始化Tree页面的scope
	function _buildTreeNodeScope($scope, crudService, routers){
		routers = routers || crudService.routers;
		$scope.edit = function($index){
			var data = $scope.nodes[$index];
			var stateName = routers && routers.edit || $scope.$state.current.name + ".edit";
			$scope.$state.go(stateName, {id: data.bean.id});
		};
		
		$scope.exchangeSeq = function(fromIndex, toIndex){
			var fromData = $scope.nodes[fromIndex];
			var toData = $scope.nodes[toIndex];
			if(!toData){//预防第一个还点“向上”，以及最后一个元素个还点“向下”
				return;
			}
			
			crudService.exchangeSeq(fromData.bean.id, toData.bean.id)
			//final.
			.then(function(){//resolve
				var copy = angular.copy(fromData);
				$scope.nodes[fromIndex] = angular.copy($scope.nodes[toIndex]);
				$scope.nodes[toIndex] = copy;
			}, function(reason){//reject
				if(angular.isString(reason)){
					$hui.toast(reason);
				}
			});
		};

		$scope.addSibling = function($index, level){
			var data = $scope.nodes[$index];
			var config = {siblingId:data.bean.id, level:level};
			var stateName = routers && routers.add || $scope.$state.current.name + ".add";
			$scope.$state.go(stateName, config);
		};
		
		$scope.addChild = function($index, level){
			var data = $scope.nodes[$index];
			var parentId = data.bean.id;
			var config = {parentId:parentId, level:level + 1};
			var stateName = routers && routers.add || $scope.$state.current.name + ".add";
			$scope.$state.go(stateName, config);
		};
		
		$scope.remove = function($index){
			var data = $scope.nodes[$index];
			
			$q.when()
			//1.检查是否有下级数据，有的话则拒绝
			.then(function(){
				return data.childs && data.childs.length && $q.reject("请先删除下级数据")
			})
			//2.询问是否删除
			.then(function(){
				return $hui.confirm("确定删除分类 " + data.bean.name + " ?");
			})
			//3.向服务器发起删除请求
			.then(function(){
				return crudService.remove(data.bean.id);
			})
			//final.更新页面数据
			.then(function(){
				$scope.nodes.splice($index, 1);
			}, function(reason){
				reason && $hui.toast(reason.error || reason);
			});
		};
	}
}])