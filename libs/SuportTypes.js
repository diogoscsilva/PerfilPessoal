"use strict"
Proto.module('Generic', function () {
  var Generic = Proto.interface('Generic', function (global) {
    return {
      GenericType: Proto.Any,
      of: function ofFn(Type, args) {
        Type = Type || this.GenericType
        if (Proto.interfaceof(Type, GenericBox)) {
          Generic.assert(Type.default || Type.getType(), this.GenericType)
        } else {
          Generic.assert(Type, this.GenericType)
        }
        var instance = this.new.apply(this, args || [])
        global.private(instance).Type = Type
        return instance
      },
      getType: function getType() {
        if (!Util.hasOwn(this, '_this')) {
          return this.GenericType
        }
        var _this = global.private(this)
        return _this.Type || this.GenericType
      },
      assert: function assert(obj, Type) {
        if (!Generic.typeof(obj, Type)) {
          throw new TypeError('Item ' + obj + ' must be type of ' + Generic.getName(Type))
        }
      },
      method: function method (instance, GenericType, fn) {
        GenericType = GenericType || Proto.Any
        function genericMethod () {
           return this.of(GenericType).apply(instance, arguments)
        }
        Util.def(genericMethod, 'of', function (Type) {
          Generic.assert(Type, GenericType) 
          return Object.freeze({
            call: function call() {
              return fn.apply(instance, [Type].concat(Array.prototype.slice.call(arguments)))
            },
            apply: function apply(args) {
              return fn.apply(instance, [Type].concat(Array.prototype.slice.call(args)))
            }
          })
        })
        return genericMethod
      },
      getClassOf: function getClassOf(obj) {
        if (Proto.interfaceof(obj, Generic)) {
          var Class = Proto.getClassOf(obj)
          return Class.of(Generic.getType.call(obj))
        }
        return Proto.getClassOf(obj)
      },
      getName: function getName(Type) {
        if (Proto.interfaceof(Type, Generic) && Generic.getType.call(Type) !== Type.GenericType) {
          return Proto.getName(Type) + '(' + Generic.getName(Generic.getType.call(Type)) + ')'
        }
        return Proto.getName(Type)
      },
      typeof: function typeofFn(Class, Type) {
        return Proto.typeof(Class, Type)
          || Proto.interfaceof(Type, Generic)
          && Generic.prototypeof(Class, Type)
      },
      prototypeof: function prototypeof(Class, Type) {
        return (Util.hasOwn(Type, '_this'))
          && Proto.prototypeof(Class, Proto.getClassOf(Type))
          && Generic.typeof(Generic.getType.call(Class), Generic.getType.call(Type))
      }
    }
  })
  
var GenericBox = Proto.interface('GenericBox', function (global) {
  global.extends([Generic])
  return {
    checkType: undefined,
    with: function withFn(value) {
      var _this = global.private(this)
      Util.def(_this, 'default', value)
      if (_this.default !== undefined && !this.checkType(_this.default)) {
        throw new TypeError(Generic.getName(this.getType()) + ' is not type of ' + _this.default + '.')
      }
      return this
    },
    guard: function guard(checkGuard, guardMessage) {
      var _this = global.private(this)
      if (_this.default !== undefined && !checkGuard(_this.default)) {
        throw new RangeError(guardMessage || 'Parameter does not fulfill the ' + i + ' guard check.')
      }
      _this.guards = _this.guards || []
      _this.guards.push({ check: checkGuard, message: guardMessage })
      return this
    },
    check: function check(value, instance) {
      var _this = global.private(this)
      if (!this.checkType(value)) {
        return false
      }
      var guards = _this.guards || []
      for (var i = 0; i < guards.length; i++) {
        if (!guards[i].check.call(instance || {}, value)) {
          throw new RangeError(guards[i].message || 'Parameter does not fulfill the ' + i + ' guard check.')
        }
      }
      return true
    },
    get default() {
      return global.private(this).default
    },
    assertGeneric: function assertGeneric(Type) {
      if (!Proto.interfaceof(Type, Generic)) {
        throw new TypeError('Type of in box must be generic.')
      }
    },
    typeof: function typeofFn(Class, Type, instance) {
      if (Proto.interfaceof(Type, GenericBox)) {
        return Type.check(Class, instance)
      }
      return Generic.typeof(Class, Type)
    },
    abstractWith: function abstractWith(value) {
      global.private(this).abstract = true
      return this.with(value)
    },
    hasAbstraction: function hasAbstraction() {
      var Type = this.getType()
      if (!Proto.isCreatedByProto(Type)) {
        return false
      }
      return Type.class.interface || Type.class.abstract || global.private(this).abstract
    }
  }
})
return {
  Generic,
  GenericBox
}
})

Proto.module('Ref', function () {

  var Ref = Proto.abstract('Ref', function (global) {
    return {
      new: function newFn (callback) {
        var _this = global.private(this)
        _this.callback = callback
      },
      get: function getFn (Type, GenericType) {
        var _this = global.private(this)
        return _this.callback(Type, GenericType)
      }
    }
  })
  var GenericRef = Proto.class('GenericRef', function (global) {
    global.extends(Ref)
    return {
      get type() {
        return GenericRef.new(function (Type, GenericType) {
          return GenericType
        })
      }
    }
  })
  var TypeRef = Proto.class('TypeRef', function (global) {
    global.extends(Ref)
    return {
      get this() {
        return TypeRef.new(Util.pass)
      },
      get: function getFn (Type) {
        var _this = global.private(this)
        if (!_this.item) {
          var result = global.super.get.call(this, Type)
          _this.item = result
        }
        return _this.item
      }
    }
  })

return {
  Ref,
  GenericRef,
  TypeRef
}
})

Proto.module('Task', function (imports) {

var Generic = imports.Generic.Generic
var GenericBox = imports.Generic.GenericBox

var Task = Proto.class('Task', function (global) {
  global.implements([Generic])
  
  var queue = []
  var inExecution = false
  function execQueue () {
    var i = 0
    while (i < queue.length) {
      queue[i++]()
    }
    queue = []
    inExecution = false
  }
  function scheduleExec (callbacks) {
    Util.insert(queue, queue.length, callbacks)
    callbacks.length = 0
    if (!inExecution) {
      inExecution = true
      setTimeout(execQueue, 0)
    }
  }
  function tryToSchedule (settledState, callbacks) {
    if (settledState) {
      scheduleExec(callbacks)
    }
  }

    function thenExec (instance, callback, rejectCallback) {
      var _this = global.private(instance)
      _this.onResolve.push(function () {
        return execTask(_this.result, callback, rejectCallback)
      })
      _this.onReject.push(function () {
        return (rejectCallback(_this.result))
      })
      tryToSchedule(_this.settledResolve, _this.onResolve)
      tryToSchedule(_this.settledReject, _this.onReject)
    }
    function execTask (result, callback, rejectCallback) {
      try {
        return (callback(result))
      }
      catch(e) {
        return rejectCallback(e)
      }
    }
  return {
    new: function newFn (callback) {
      var _this = global.private(this)
      _this.onResolve = []
      _this.onReject = []
      _this.result = undefined
      _this.settledResolve = false
      _this.settledReject = false
      var thisTask = this
      _this.fulfill = function fulfill(result) {
        if (!GenericBox.typeof(result, thisTask.getType())) {
          throw new TypeError('Value ' + Generic.getName(result) + ' is not a type of ' + Generic.getName(thisTask.getType()))
        }
        if (!_this.settledResolve && !_this.settledReject) {
          _this.result = result
          _this.settledResolve = true
          scheduleExec(_this.onResolve)
        }
        return result
      }
      _this.reject = function reject(result) {
        if (!_this.settledResolve && !_this.settledReject) {
          _this.result = result
          _this.settledReject = true
          scheduleExec(_this.onReject)
        }
        return result
      }
      callback = callback || Util.noAction
      callback(_this.fulfill, _this.reject)
    },
    make: function make (obj) {
      var taskFulfill, taskReject
      var newTask = Task.of(this.getType(), [function (fulfill, reject) {
        taskFulfill = fulfill
        taskReject = reject
      }])
      Task.resolve(obj)
      .then(function (result) {
        taskFulfill(result)
      }, taskReject)
      return newTask
    },
    resolve: function resolve (obj) {
      if (Proto.prototypeof(obj, Task)) {
        return obj
      }
      var resolveFulfill, resolveRecject
      var newTask = Task.new(function (fulfill, reject) {
        resolveFulfill = fulfill
        resolveRecject = reject
      })
      if (typeof obj === 'object' && typeof obj.then === 'function') {
        obj.then(resolveFulfill, resolveRecject)
        return newTask
      }
      resolveFulfill(obj)
      return newTask
    },
    reject: function reject (obj) {
      if (Proto.prototypeof(obj, Task)) {
        return obj
      }
      var rejectTask
      var newTask = Task.new(function (fulfill, reject) {
        rejectTask = reject
      })
      if (typeof obj === 'object' && typeof obj.then === 'function') {
        obj.then(rejectTask, rejectTask)
        return newTask
      }
      rejectTask(obj)
      return newTask
    },
    all: function all (tasks) {
      var allFulfill, allReject
      var allTask = Task.new(function (fulfill, reject) {
        allFulfill = fulfill
        allReject = reject
      })
      var results = []
      var count = 0
      for (var i = 0, len = tasks.length; i < len; i++) {
        Task.resolve(tasks[i])
        .then(function (i) {
          return function (result) {
            count++
            results[i] = result
            if (count === len) {
              allFulfill(results)
            }
          }
        }(i), allReject)
      }
      return allTask
    },
    join: function join () {
      return Task.all(arguments)
    },
    flowList: function flowList (list) {
      var tasks = [this.then(list[0])]
      for (var i = 1; i < list.length; i++) {
        tasks.push(tasks[i - 1].then(list[i]))
      }
      return Task.all(tasks)
    },
    flow: function flow () {
      return this.flowList(arguments)
    },
    race: function race (tasks) {
      var raceFulfill, raceReject
      var newTask = this.make(function (fulfill, reject) {
        raceFulfill = fulfill
        raceReject = reject
      })
      for (var i = 0; i < tasks.length; i++) {
        Task.resolve(tasks[i])
        .then(raceFulfill, raceReject)
      }
      return newTask
    },
    method: function method (obj, methodName) {
      var thisTask = this
      return function bind () {
        return thisTask.make(obj[methodName].apply(obj, arguments))
      }
    },
    until: function until (test, callback) {
      var resolve, reject
      var thisTask = this
      var settled = false
      function resolveUntil (value) {
        settled = true
        return resolve(value)
      }
      var untilTask = Task.new(function (ok, error) {
        resolve = ok
        reject = error
      })
      thisTask.then(function repeat (result) {
        Task.resolve(test(result)).then(function (ok) {
          if (ok) {
            return Task.resolve(callback(result, resolveUntil))
            .then(function (result) {
              if (!settled) {
                repeat(result)
              }
            }, reject)
          } else {
            thisTask.then(resolveUntil, reject)
          }
        }, reject)
      })
      return untilTask
    },
    range: function range (refs, callback) {
      var setup = Util.setupRange(refs)
      var i = 0
      return this
      .until(function () {
        return i < setup.length
      },
      function (result, resolve) {
        result = setup.start + i * setup.step
        return Task.resolve(callback(result, resolve))
        .then(function () {
          i++
          return result + setup.step
        })
      })
    },
    beside: function beside (callback) {
      return Task.all([this, this.then(callback)])
      .then(function (tuple) {
        return tuple[0]
      })
    },
    then: function then (callback, rejectCallback) {
      var thenFulfill, thenReject
      var newTask = Task.new(function (fulfill, reject) {
        thenFulfill = fulfill
        thenReject = reject
      })
      callback = callback || Util.pass
      thenExec(this, function (result) {
        if (result && typeof result.then === 'function') {
          result.then(callback, rejectCallback || thenReject)
          .then(thenFulfill, thenReject)
        } else {
          thenFulfill(execTask(result, callback, thenReject))
        }
      },
      rejectCallback && function (result) {
        if (result && typeof result.then === 'function') {
          result.then(rejectCallback, thenReject)
          .then(thenFulfill, thenReject)
        } else {
          thenFulfill(execTask(result, rejectCallback, thenReject))
        }
      }
      || thenReject)
      return newTask
    },
    mix: function mix (callback, reject) {
      return this.then(function (results) {
        return callback.apply(this, results)
      }, reject)
    },
    catch: function catchFn (callback) {
      return this.then(Util.pass, callback)
    },
    isPending: function isPending () {
      var _this = global.private(this)
      return !_this.settledResolve && !_this.settledReject
    },
    isResolved: function isResolved () {
      return global.private(this).settledResolve
    },
    isRejected: function isRejected () {
      return global.private(this).settledReject
    },
    finally: function finallyFn (callback) {
      var thisTask = this
      function finallyFn () {
        var finallyTask = Task.resolve(callback())
        if (finallyTask.isRejected()) {
          return finallyTask
        }
        return thisTask
      }
      return thisTask.then(finallyFn, finallyFn)
    }
  }
})

return {
  Task
}
})


Proto.module('ObjectIterator', function (imports) {

  var Task = imports.Task.Task

  var Iterable = Proto.interface('Iterable', function () {
    return {
      getItem: undefined,
      hasNext: undefined,
      incrementIndex: undefined
    }
  })
  
  var Iterator = Proto.class('Iterator', function (global) {
    return {
      new: function newFn(iterable) {
        var _this = global.private(this)
        _this.iterable = iterable
      },
      next: function next() {
        var _this = global.private(this)
        _this.index = _this.iterable.incrementIndex(_this.index)
        if (_this.iterable.hasNext(_this.index)) {
          return {
            value: _this.iterable.getItem(_this.index),
            key: _this.index,
            done: false
          }
        }
        return this.done()
      },
      done: function done() {
        delete global.private(this).index
        return {
          done: true
        }
      }
    }
  })

  var Break = Proto.class('Break', function () {
    return {
      new: function newFn (value) {
        Util.final(this, 'value', value)
      },
      get true () {
        return Break.new(true)
      },
      get false () {
        return Break.new(false)
      }
    }
  })
  var noBreak = Break.new()

  var ObjectMethods = Proto.interface('ObjectMethods', function () {
    function getContainerObject(iterable) {
      var object = {}
      if (iterable && typeof iterable === 'object'
        && typeof iterable.length === 'number'
        && !Object.prototype.propertyIsEnumerable.call(iterable, 'length')) {
        object = []
      }
      return object
    }
    function mapCallbackTasksToObject(callback, object) {
      var tasks = []
      var taskCallback = function (item, key, source) {
        tasks.push(callback.call(this, item, key, source)
          .then(function (item) { return object[key] = item }))
      }
      return { callback: taskCallback, tasks }
    }
    function forEachCallbackTasks(callback) {
      var tasks = []
      var taskCallback = function (item, key, source) {
        tasks.push(callback.call(this, item, key, source))
      }
      return { callback: taskCallback, tasks }
    }
    return {
      asyncMap: function asyncMap(callback, thisObj) {
        var object = getContainerObject(this)
        var asyncObj = mapCallbackTasksToObject(callback, object)
        ObjectMethods.map.call(this, asyncObj.callback, thisObj)
        return Task.all(asyncObj.tasks)
          .then(function () { return object })
      },
      asyncForEach: function asyncForEach(callback, thisObj) {
        var asyncObj = forEachCallbackTasks(callback)
        ObjectMethods.forEach.call(this, asyncObj.callback, thisObj)
        return Task.all(asyncObj.tasks)
          .then(function () {})
      },
      Break,
      map: function map(callback, objThis) {
        var object = getContainerObject(this)
        for (var propName in this) {
          if (Util.hasOwn(this, propName)) {
            var item = this[propName]
            if (propName === '__proto__') {
              Util.define(object, propName, {
                value: callback.call(objThis || {}, item, propName, this),
                writable: true,
                enumareble: true,
                configurable: true
              })
            } else {
              object[propName] = callback.call(objThis || {}, item, propName, this)
            }
          }
        }
        return object
      },
      forEach: function forEach(callback, thisObj) {
        for (var propName in this) {
          if (Util.hasOwn(this, propName)) {
            var item = this[propName]
            callback.call(thisObj || {}, item, propName, this)
          }
        }
      },
      untilDone: function untilDone(callback, thisObj) {
        for (var propName in this) {
          if (Util.hasOwn(this, propName)) {
            var item = this[propName]
            var done = callback.call(thisObj || {}, item, propName, this)
            if (Util.prototypeof(done, Break)) {
              return done
            }
          }
        }
        return noBreak
      },
      filter: function filter(callback, thisObj) {
        var filtered = getContainerObject(this)
        ObjectMethods.forEach.call(this, function (item, key, thisObj) {
          if (callback.call(this, item, key, thisObj)) {
            filtered[key] = item
          }
        }, thisObj)
        return filtered
      },
      some: function some(callback, thisObj) {
        thisObj = thisObj || this
        function breakCallback(item, key, thisObj) {
          if (callback.call(this, item, key, thisObj)) {
            return Break.true
          }
        }
        return ObjectMethods.untilDone.call(this, breakCallback, thisObj) !== noBreak
      },
      every: function every(callback, thisObj) {
        thisObj = thisObj || this
        function breakCallback(item, key, thisObj) {
          if (!callback.call(this, item, key, thisObj)) {
            return Break.false
          }
        }
        return ObjectMethods.untilDone.call(this, breakCallback, thisObj) === noBreak
      },
      findKey: function findKey (callback, thisObj) {
        thisObj = thisObj || this
        function breakCallback(item, key, thisObj) {
          if (callback.call(this, item, key, thisObj)) {
            return Break.new(key)
          }
        }
        return ObjectMethods.untilDone.call(this, breakCallback, thisObj).value
      },
      assign: function assign(obj) {
        var newObj = ObjectMethods.toObject.call(this)
        for (var propName in obj) {
          if (Util.hasOwn(obj, propName)) {
            if (propName === '__proto__') {
              Util.define(newObj, propName, {
                value: obj[propName],
                writable: true,
                enumareble: true,
                configurable: true
              })
            } else {
              newObj[propName] = obj[propName]
            }
          }
        }
        return newObj
      },
      toObject: function toObject() {
        return ObjectMethods.map.call(this, function (item) { return item })
      }
    }
  })

return {
  Iterable,
  Iterator,
  ObjectMethods,
}
})

Proto.module('Box', function (imports) {

  var Generic = imports.Generic.Generic
  var GenericBox = imports.Generic.GenericBox
  var Ref = imports.Ref.Ref
  var ObjectMethods = imports.ObjectIterator.ObjectMethods


var TypeBox = Proto.interface('TypeBox', function (global) {
  global.extends([GenericBox])
  return {
    create: function create(name, BoxType) {
      var Type = this
      return Proto.class(name, function (global) {
        global.implements([Type])
        return BoxType
      })
    },
    ref: function ref (typeBox) {
      Generic.assert(typeBox, TypeBox)
      var ref = typeBox.getType()
      Generic.assert(ref, Ref)
      return Proto.getClassOf(ref).new(function (Type, GenericType) {
        return Proto.getClassOf(typeBox).of(ref.get(Type, GenericType)).with(typeBox.default)
      })
    }
  }
})
var Box = TypeBox.create('Box', {
  checkType: function checkType(Class) {
    return TypeBox.typeof(Class, this.getType())
  }
})
var InBox = TypeBox.create('InBox', {
  checkType: function checkType(Class) {
    return TypeBox.typeof(this.getType(), Class)
  }
})
var JustBox = TypeBox.create('JustBox', {
  checkType: function checkType(Class) {
    return TypeBox.typeof(Class, this.getType()) && Generic.getType.call(this.getType()) === Generic.getType.call(Class.getType())
  }
})
var TypeContainer = Proto.interface('TypeContainer', function (global) {
  global.extends([TypeBox])
})
var BoxContainer = TypeContainer.create('BoxContainer', {
  checkType: function checkType(Class) {
    BoxContainer.assertContainer.call(this, Class)
    if (this.default === Class || this.getType() === Proto.Any) {
      return true
    }
    return ObjectMethods.every.call(Class, Box.checkType, this)
  },
  assertContainer: function assertContainer(Class) {
    var Type = Proto.getType(this.default)
    if (!Proto.typeof(Class, Type)) {
      throw new TypeError('Container must be a type of ' + Proto.getName(Type))
    }
  }
})
var InBoxContainer = TypeContainer.create('InBoxContainer', {
  checkType: function checkType(Class) {
    BoxContainer.assertContainer.call(this, Class)
    if (this.getType() === Proto.Any) {
      return true
    }
    return ObjectMethods.every.call(Class, InBox.checkType, this)
  }
})
var JustBoxContainer = TypeContainer.create('JustBoxContainer', {
  checkType: function checkType(Class) {
    BoxContainer.assertContainer.call(this, Class)
    if (this.getType() === Proto, Any) {
      return true
    }
    return ObjectMethods.every.call(Class, JustBox.checkType, this)
  }
})

return {
  TypeBox,
  Box,
  InBox,
  JustBox,
  TypeContainer,
  BoxContainer,
  InBoxContainer,
  JustBoxContainer
}
})

Proto.module('DataProxy', function (imports) {
  
  var Generic = imports.Generic.Generic
  var Ref = imports.Ref.Ref
  var Box = imports.Box.Box
  var TypeRef = imports.Ref.TypeRef
  var TypeBox = imports.Box.TypeBox
  
var DataClass = Proto.lib('DataClass', function () {
  var ConstValue = Proto.class('ConstValue', function () {
    return {
      new: function newFn(Type) {
        Util.def(this, 'value', Type)
      }
    }
  })
  var PropertyDiscriptor = Proto.class('PropertyDiscriptor', function () {
    return {
      new: function newFn(discriptor) {
        for (var key in discriptor) {
          if (Util.hasOwn(discriptor, key) && key !== '__proto__') {
            this[key] = discriptor[key]
          }
        }
      }
    }
  })
  var WrapObj = Proto.class('WrapObj', function () {
    return {
      new(obj) {
        Util.def(this, 'arg', obj || {})
      }
    }
  })
  var GenericOf = Proto.interface('GenericOf', function () {
    return {
      of: function ofFn (Type, args) {
        args = args || []
        return Generic.of.call(this, Type, [WrapObj.new(args[0])])
      }
    }
  })
  function createWritableProperty(propName) {
    return function createWritableProperty(instance, value) {
      Util.define(instance, propName, {
        value: value,
        writable: true,
        enumerable: true
      })
    }
  }
  function createProperty(propName, discriptor) {
    return function createProperty(instance) {
      Util.define(instance, propName, discriptor)
    }
  }
  function createTypedProperty(propName, Type, checkType) {
    return function createTypedProperty(instance, value, _this) {
      _this.store[propName] = checkType(value, Type, instance)
      Util.define(instance, propName, {
        get: function getFn() {
          return _this.store[propName]
        },
        set: function setFn(value) {
          _this.store[propName] = checkType(value, Type, instance)
        },
        enumerable: true
      })
    }
  }
  function createConstProperty(propName) {
    return function createConstProperty(instance, value) {
      Util.define(instance, propName, {
        value: value,
        enumerable: true
      })
    }
  }
  function createConstTypedProperty(propName, Type, checkType) {
    var create = createConstProperty(propName)
    return function createConstTypedProperty(instance, value) {
      value = checkType(value, Type, instance)
      create.call(this, instance, value)
    }
  }
  function checkTypeBoxed(value, Type, instance) {
    if (value === undefined) {
      value = Type.default
    }
    if (!TypeBox.typeof(value, Type, instance)) {
      throw new TypeError('Value ' + value + ' is not type of ' + Generic.getName(Type) + ' in DataClass ' + Generic.getName(instance) + '.')
    }
    return value
  }
  function checkType(value, Type, instance) {
    if (!Generic.typeof(value, Type)) {
      throw new TypeError('Value ' + value + ' is not type of ' + Generic.getName(Type) + ' in DataClass ' + Generic.getName(instance) +  '.')
    }
    return value
  }
  function changeRef(propName, ref, create) {
    return function createTyped(instance, value, _this) {
      if (Proto.prototypeof(ref, TypeRef)) {
        var Type = ref.get(this)
        var check = Proto.interfaceof(Type, TypeBox) && checkTypeBoxed || checkType
        create(propName, Type, check)(instance, value, _this)
      } else {
        var thisType = this
        function refCheckType (value, ref, instance) {
          var Type = ref.get(thisType, Generic.getType.call(instance))
          var check = Proto.interfaceof(Type, TypeBox) && checkTypeBoxed || checkType
          return check(value, Type, instance) 
        }
        create(propName, ref, refCheckType)(instance, value, _this)
      }
    }
  }
  function makeCreators(props) {
    var properties = []
    for (var i = 0; i < props.length; i++) {
      var property = props[i]
      properties[i] = {
        name: property[0]
      }
      if (property[0] === '__proto__') {
        delete properties[i]
      } else if (property[1] === undefined || property[1] === Proto.Any) {
        properties[i].create = createWritableProperty(property[0])
      } else if (Proto.prototypeof(property[1], ConstValue)) {
        if (property[1].value === undefined || property[1].value === Proto.Any) {
          properties[i].create = createConstProperty(property[0])
        } else if (Proto.prototypeof(property[1].value, Ref)) {
          properties[i].create = changeRef(property[0], property[1].value, createConstTypedProperty)
        } else if (Proto.interfaceof(property[1].value, TypeBox)) {
          properties[i].create = createConstTypedProperty(property[0], property[1].value, checkTypeBoxed)
        } else {
          properties[i].create = createConstTypedProperty(property[0], property[1].value, checkType)
        }
      } else if (Proto.prototypeof(property[1], Ref)) {
        properties[i].create = changeRef(property[0], property[1], createTypedProperty)
      } else if (Proto.interfaceof(property[1], TypeBox)) {
        properties[i].create = createTypedProperty(property[0], property[1], checkTypeBoxed)
      } else if (Proto.prototypeof(property[1], PropertyDiscriptor)) {
        properties[i].create = createProperty(property[0], property[1])
      } else {
        properties[i].create = createTypedProperty(property[0], property[1], checkType)
      }
    }
    return properties
  }
  function createClass(name, props, creators, interfaces, extensions) {
    return Proto.sealed(name, function (global) {
      global.implements(DataClass.extendInterfaces(name, interfaces, extensions))
      var interfacesList = global.class.implements || []
      var genericIndex = interfacesList.indexOf(Generic)
      if (genericIndex > -1) {
        global.class.implements = interfacesList.slice()
        Util.insert(global.class.implements, genericIndex, [GenericOf])
      } else if (interfacesList.some(function (Interface) {
        return Proto.interfaceof(Interface, Generic)
      })) {
        global.class.implements = interfacesList.concat(GenericOf)
      }
      global.static = function (Type) {
        Type.void = Type.new()
        if (creators.length === 0) {
          creators = makeCreators(props)
        }
      }
      return {
        new: function newFn() {
          var _this = global.private(this)
          _this.store = {}
          if (Proto.prototypeof(arguments[0], WrapObj)) {
            var args = arguments[0].arg
            for (var i = 0; i < creators.length; i++) {
              var propName = creators[i].name
              var prop = undefined
              if (Util.hasOwn(args, propName)) {
                prop = args[propName]
              } else if (Util.hasOwn(args, i)) {
                prop = args[i]
              }
              creators[i].create.call(global.seal.Type, this, prop, _this)
            }
          } else {
            for (var i = 0; i < creators.length; i++) {
              creators[i].create.call(global.seal.Type, this, arguments[i], _this)
            }
          }
          for (var key in this) {
            if (Util.hasOwn(this, key)) {
              return this
            }
          }
          return Proto.getClassOf(this).void
        },
        toArray() {
          var args = []
          for (var i = 0; i < creators.length; i++) {
            var propName = creators[i].name
            args.push(this[propName])
          }
          return args
        },
        init: function init(obj) {
          return this.new(WrapObj.new(obj))
        },
        implements: function implementsFn (name, interfaces, extensions) {
          return createClass(name, props, creators, interfaces, extensions)
        },
        extends: function extendsFn (name, interfaces, extensions) {
          extensions = extensions || []
          return createClass(name, props, creators, interfaces, extensions.concat(interfacesList))
        }
      }
    })
  }
  return {
    ConstValue,
    const: function constFn (Type) {
      return ConstValue.new(Type)
    },
    def: function def(discriptor) {
      return PropertyDiscriptor.new(discriptor || {})
    },
    get void() {
      return TypeRef.new(function (Type) { return Box.of(Type).with(Type.void) })
    },
    create: function create(name, props, interfaces, extensions) {
      return createClass(name, props, [], interfaces, extensions)
    },
    extendInterfaces: function extendInterfaces (name, interfaces, extensions) {
      if (!Proto.instanceof(interfaces, Array) && (interfaces || extensions)) {
        return [DataClass.createInterface(name, interfaces, extensions)]
      } else if (interfaces && extensions) {
        return interfaces.concat(extensions)
      }
      return interfaces
    },
    createInterface: function createInterface(name, interfaceObj, extensions) {
      return Proto.interface(name + 'Methods', function (global) {
        global.extends(extensions)
        return interfaceObj
      })
    }
  }
})

var ProtoProxy = Proto.lib('ProtoProxy', function () {
  return {
    create: function create(name, Type, setupHandlers) {
      return Proto.class(name, function (global) {
        var handlers = setupHandlers(global)
        var interfaces = global.class.implements || []
        function delegateProp (propName) {
          return function delegate() { 
            var objThis = global.private(this).target
            return objThis[propName]
          }
        }
        function delegateFn (propName) {
          return function delegate() {
            var thisObj = global.private(this).target
            return thisObj[propName].apply(thisObj, arguments)
          }
        }
        function delegateInterface(Interface) {
          for (var propName in Interface) {
            if (Util.hasOwn(Interface, propName) && !Util.hasOwn(handlers, propName)) {
              if (propName in Type && (!(propName in Object) || Object[propName] !== Type[propName])) {
                var discriptor = Object.getOwnPropertyDescriptor(Proto.getPropertyOwner(Type, propName), propName)
                if (discriptor.hasOwnProperty('writable')
                && (discriptor.value === undefined || typeof discriptor.value === 'function')) {
                  Util.var(handlers, propName, delegateFn(propName))
                } else {
                  Util.pseudo(handlers, propName, {get: delegateProp(propName)})
                }
              }
            }
          }
        }
        for (var i = 0; i < interfaces.length; i++) {
          var Interface = interfaces[i]
          delegateInterface(Interface)
        }
        handlers.new = handlers.new || function newFn (target) {
          if (!Type.typeof(target)) {
            throw new TypeError('Target ' + Proto.getClassOf(target).class.name + ' must be instance of ' + Type.class.name + '.')
          }
          global.private(this).target = target
        }
        return handlers
      })
    }
  }
})

return {
  DataClass,
  ProtoProxy
}
})

Proto.module('Patterns', function (imports) {

var Generic = imports.Generic.Generic
var TypeBox = imports.Box.TypeBox
var Task = imports.Task.Task

var SimpleCache = Proto.class('SimpleCache', function (global) {
  return {
    new: function newFn() {
      var _this = global.private(this)
      _this.cache = {}
      _this.first = true
    },
    clearIf: function clearIf(isFirst) {
      if (isFirst) {
        var _this = global.private(this)
        _this.first = true
        _this.cache = {}
      }
    },
    isFirst: function isFirst() {
      var _this = global.private(this)
      var isFirst = _this.first
      _this.first = false
      return isFirst
    },
    has: function has (key) {
      var _this = global.private(this)
      return Util.hasOwn(_this.cache, key.toString)
    },
    get: function getFn (key) {
      var _this = global.private(this)
      return _this.cache[key.toString()]
    },
    set:  function setFn(key, value) {
      var _this = global.private(this)
      _this.cache[key.toString()] = value
    }
  }
})
var Patterns = Proto.class('Patterns', function (global) {
  var StorageInterface = Proto.interface('StorageInterface', function () {
    return {
      getValue: undefined,
      getPattern: undefined,
      check: function check(value) {
        return Patterns.check(value, this.getPattern())
      }
    }
  })
  var Storage = Proto.class('Storage', function (global) {
    global.implements([StorageInterface])
    return {
      new: function newFn(pattern) {
        var _this = global.private(this)
        _this.cache = SimpleCache.new()
        _this.pattern = pattern
      },
      getPattern: function getPattern () {
        return global.private(this).pattern
      },
      getValue: function getFn(values, fn) {
        var cache = global.private(this).cache
        var value = values[values.length - 1]
        if (!cache.has(value)) {
          cache.set(value, fn.apply({}, values))
        }
        return cache.get(value)
      },
      isFirst: function isFirst() {
        var cache = global.private(this).cache
        return cache.isFirst()
      },
      clearIF: function clearIf(isFirst) {
        var cache = global.private(this).cache
        return cache.clearIf(isFirst)
      }
    }
  })
  var Memo = Proto.class('Memo', function (global) {
    global.implements([StorageInterface])
    return {
      new: function newFn(pattern) {
        var _this = global.private(this)
        _this.cache = SimpleCache.new()
        _this.pattern = pattern
      },
      getPattern: function getPattern () {
        return global.private(this).pattern
      },
      getValue: function getFn(values, fn) {
        var cache = global.private(this).cache
        var isFirst = cache.isFirst()
        var result = cache.get(values[values.length - 1], fn)
        cache.clearIf(isFirst)
        return result
      }
    }
  })

  function checkValue (pattern, fn) {
    return function checkFn (values, out) {
      if (values[values.length - 1] === pattern) {
        out.result = fn.apply({}, values)
        return true
      }
      return false
    }
  }

  function returnCheckValue (pattern, result) {
    return function checkFn (values, out) {
      if (values[values.length - 1] === pattern) {
        out.result = result
        return true
      }
      return false
    }
  }

  function defaultValue (fn) {
    return function checkFn (values, out) {
      out.result = fn.apply({}, values)
      return true
    }
  }

  function returnDefaultValue (result) {
    return function checkFn (values, out) {
      out.result = result
      return true
    }
  }

  function checkFunction (pattern, fn) {
    return function checkFn (values, out) {
      var value = values[values.length - 1]
      if ((pattern.prototype !== undefined && Proto.instanceof(value, pattern))
      || pattern(value) === true) {
        out.result = fn.apply({}, values)
        return true
      }
      return false
    }
  }

  function returnCheckFunction (pattern, result) {
    return function checkFn (values, out) {
      var value = values[values.length - 1]
      if ((pattern.prototype !== undefined && Proto.instanceof(value, pattern))
      || pattern(value) === true) {
        out.result = result
        return true
      }
      return false
    }
  }

  function checkObject (pattern, fn, checker) {
    return function checkFn (values, out) {
      var value = values[values.length - 1]
      if (TypeBox.typeof(value, pattern)
      || Util.isEqual(value, pattern)
      || Util.isSameOf(value, pattern, checker)) {
        out.result = fn.apply({}, values)
        return true
      }
      return false
    }
  }

  function returnCheckObject (pattern, result, checker) {
    return function checkFn (values, out) {
      var value = values[values.length - 1]
      if (TypeBox.typeof(value, pattern)
      || Util.isEqual(value, pattern)
      || Util.isSameOf(value, pattern, checker)) {
        out.result = result
        return true
      }
      return false
    }
  }

  function checkStorage (storage, fn) {
    return function checkFn (values, out) {
      if (storage.check(values[values.length - 1])) {
        out.result = storage.getValue(values, fn)
        return true
      }
      return false
    }
  }

  return {
    isSameOf: function isSameOf(obj, Types) {
      return Util.isSameOf(obj, Types, TypeBox)
    },
    isSameObject: function isSameOf(obj, Types) {
      return Util.isSameOf(obj, Types)
    },
    in: function inFn(obj) {
      return function includes(value) { return obj.includes(value) }
    },
    memo: function memo(pattern) {
      return Memo.new(pattern)
    },
    storage: function storage(pattern) {
      return Storage.new(pattern)
    },
    has: function has(obj) {
      return function has(key) { return Util.hasOwn(obj, key) }
    },
    kind: function kind(Type, subTypeName) {
      return function kind(obj) { return TypeBox.typeof(obj, Type) && obj.isKindOf(subTypeName) }
    },
    check: function check(value, pattern) {
      return Util.checkPattern(value, pattern, TypeBox)
    },
    checkObject: function check(value, pattern) {
      return Util.checkPattern(value, pattern)
    },
    new: function newFn(Type, entries) {
      var _this = global.private(this)
      _this.Type = Type
      _this.patterns = entries.map(function (item) {
        if (typeof item[1] === 'function') {
          if (item[0] === Proto.Any) {
            return defaultValue(item[1])
          } else if (typeof item[0] === 'function') {
            return checkFunction(item[0], item[1])
          } else if (typeof item[0] === 'object') {
            if (Proto.interfaceof(item[0], StorageInterface)) {
              return checkStorage(item[0], item[1])
            } else if (Proto.isCreatedByProto(item[0])) {
              return checkObject(item[0], item[1], TypeBox)
            }
            return checkObject(item[0], item[1])
          }
          return checkValue(item[0], item[1])
        } else {
          if (item[0] === Proto.Any) {
            return returnDefaultValue(item[1])
          } else if (typeof item[0] === 'function') {
            return returnCheckFunction(item[0], item[1])
          } else if (typeof item[0] === 'object') {
            if (Proto.isCreatedByProto(item[0])) {
              return returnCheckObject(item[0], item[1], TypeBox)
            }
            return returnCheckObject(item[0], item[1])
          }
          return returnCheckValue(item[0], item[1])
        }
      })
    },
    match: function match(value, dependencies) {
      var _this = global.private(this)
      var patterns = _this.patterns
      var out = {}
      var values = (dependencies || []).concat([value])
      for (var i = 0; i < patterns.length; i++) {
        if (patterns[i](values, out)) {
          break
        }
      }
      if (Generic.typeof(out.result, _this.Type)) {
        return out.result
      }
      throw new RangeError('Value does not match to any pattern.')
    },
    resolve: function resolve(value) {
      return Task.resolve(this.match(value))
    }
  }
})

return {
  Patterns,
  SimpleCache
}
})

Proto.module('DCI', function (imports) {
var Generic = imports.Generic.Generic
var ObjectMethods = imports.ObjectIterator.ObjectMethods
var DataClass = imports.DataProxy.DataClass

var DCIRole = Proto.interface('DCIRole', function () {
  return {
    GenericType: Proto.Any
  }
})

var DCIContext = Proto.interface('DCIContext', function (global) {
  return {
    setRole: function setRole (roleName, role) {
      var _this = global.private(this)
      _this.roles = _this.roles || {}
      if (!Util.hasOwn(this, roleName)) {
        Util.pseudo(this, roleName, {get: function getFn () {
          return _this.roles[roleName]
        }})
      }
      _this.roles[roleName] = role
    },
    removeRole: function removeRole (roleName) {
      var _this = global.private(this)
      if (Util.hasOwn(_this, 'roles')) {
        delete _this.roles[roleName]
      }
    }
  }
})

var DCI = Proto.lib('DCI', function () {
  return {
    ctx: function ctxFn (name, objType, interfaces, extensions) {
      var objCtx = {}
      var Roles = {}
      ObjectMethods.forEach.call(objType, function (Role, roleName) {
        if (Proto.interfaceof(Role, DCIRole)) {
          Roles[roleName] = Role
          objCtx[roleName] = function roleCreator (data) {
            var args = Array.prototype.slice.call(arguments)
            return function createRole (ctx, roleName) {
              return Role.new(ctx, roleName, data, args)
            }
          }
        }
      })
      return Proto.class(name, function (global) {
        global.implements(DataClass.extendInterfaces(name, interfaces, extensions && extensions.concat(DCIContext) || [DCIContext]))
        objCtx.new = function newFn (creators) {
          ObjectMethods.forEach.call(creators, function (createRole, roleName) {
            DCIContext.setRole.call(this, roleName, createRole(this, roleName))
          }, this)
        }
        objCtx.getRoleType = function getRoleType (roleName) {
          return Roles[roleName]
        }
        return objCtx
      })
    },
    role: function role (name, GenericType, createFn) {
      if (createFn === undefined) {
        createFn = GenericType
        GenericType = Proto.Any
      }
      function callback (global) {
        var Type = createFn(global)
        if (global.class.implements) {
          global.implements(global.class.implements.concat(DCIRole))
        } else {
          global.implements([DCIRole])
        }
        var roleNewFn = Type.new || Util.noAction
        Type.new = function newFn (ctx, roleName, data, args) {
          Util.final(this, 'ctx', ctx)
          var _this = global.private(this)
          var roleData
          var name = Proto.getName(GenericType).replace(/(?:(?:\w+\.)+)(\w)/, '$1')
          name = name.charAt(0).toLowerCase() + name.slice(1)
          Util.pseudo(_this, name, {
            set: function setFn (data) {
              Generic.assert(data, GenericType)
              roleData = data
            },
            get: function getFn () {
              return roleData
            }
          })
          Util.final(_this, 'roleName', roleName)
          if (data !== undefined) {
            _this[name] = data
          }
          roleNewFn.apply(this, args)
        }
        Type.getRoleName = function getRoleName () {
          return global.private(this).roleName
        }
        return Type
      }
      return Proto.class(name, callback)
    },
    for: function forFn (GenericType) {
      return {
        role: function role (name, createFn) {
          return DCI.role(name, GenericType, createFn)
        }
      }
    }
  }
})
return {
  DCI,
  DCIContext,
  DCIRole
}
})