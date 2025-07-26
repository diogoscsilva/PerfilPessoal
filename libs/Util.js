"use strict"
var createUtilLib = function createUtilLib () {
  var Util = {}
  function define (obj, propName, objDef) {
    Object.defineProperty(obj, propName, objDef)
  }
  function def (obj, propName, value) {
    define(obj, propName, { value: value })
  }
  def(Util, 'def', def)
  def(Util, 'define', define)
  def(Util, 'noAction', function () {})
  def(Util, 'noProp', function () {return {}})
  def(Util, 'noItem', function () {return []})
  def(Util, 'noText', function () {return ''})
  def(Util, 'value', function (value) {
    return function () {return value}
  })
  def(Util, 'this', function () {this})
  def(Util, 'false', function () {return false})
  def(Util, 'true', function () {return true})
  def(Util, 'pass', function (item) {return item})
  
  def(Util, 'final', function (obj, propName, value) {
    define(obj, propName, {enumerable: true, value: value })
  })
  def(Util, 'var', function (obj, propName, value) {
    define(obj, propName, {writable: true, enumerable: true, value: value })
  })
  def(Util, 'fn', function (obj, fn) {
    define(obj, fn.name, { value: fn })
  })
  def(Util, 'lazy', function (obj, propName, getFn) {
    define(obj, propName, {
      configurable: true, get: function () {
        def(obj, propName, getFn())
        return obj[propName]
      }
    })
  })
  def(Util, 'pseudo', function (obj, propName, objFn) {
    define(obj, propName, {enumerable: true, get: objFn.get, set: objFn.set })
  })
  
  def(Util, 'hasOwn', function (Type, propName) {
    return Object.prototype.hasOwnProperty.call(Type, propName)
  })
  def(Util, 'copyDiscriptors', function (Type, newType) {
    newType = newType || {}
    for (var propName in Type) {
      if (Util.hasOwn(Type, propName)) {
        var descriptor = Object.getOwnPropertyDescriptor(Type, propName)
        Object.defineProperty(newType, propName, descriptor)
      }
    }
    return newType
  })
  def(Util, 'copyAllDiscriptors', function (Type, newType) {
    newType = newType || {}
    var names = Object.getOwnPropertyNames(Type)
    for (var i = 0; i < names.length; i++) {
      var propName = names[i]
      var descriptor = Object.getOwnPropertyDescriptor(Type, propName)
      Object.defineProperty(newType, propName, descriptor)
    }
    return newType
  })
  def(Util, 'extend', function (Type, extention) {
    return Util.copyDiscriptors(extention, Object.create(Type))
  })
  def(Util, 'isPrototypeHide', function (obj) {
    if (typeof obj !== 'object') {
      return false
    }
    for (var prop in Object.getPrototypeOf(obj)) {
      return false
    }
    return true
  })
  def(Util, 'gt', function (p1, p2) {
    p1 = p1 || ''
    if ((p1 - p2 && p1 > p2) || (!(p1 - p2) && p1.toString().localeCompare(p2) === 1)) {
      return true
    }
    return false
  })
  def(Util, 'insert', function (arr, start, insertion) {
    var len = arr.length + insertion.length
    var end = start + insertion.length
    var temp = []
    for (var i = start; i < len; i++) {
      if (i < end) {
        temp.push(arr[i])
        arr[i] = insertion[i - start]
      } else {
        arr[i] = temp[i - end]
      }
    }
  })
  def(Util, 'addIn', function (array, value) {
    if (array.indexOf(value) === -1) {
      array.push(value)
    }
  })
  def(Util, 'setupRange', function setupRange (start, end, step) {
    var setup = {}
    if (end === undefined) {
      setup.end = start
      setup.start = 0
    } else {
      setup.start = start || 0
      setup.end = end
    }
    setup.step = step || setup.start < setup.end && 1 || -1
    setup.length = Math.ceil((setup.end - setup.start) / setup.step)
    return setup
  })
  function isOneWayEqual (obj1, obj2) {
    if (obj2 && typeof obj2 === 'object') {
      if (obj1 && typeof obj1 === 'object') {
        var result = false
        for (var key in obj2) {
          if (Util.hasOwn(obj2, key)) {
            result = true
            if (obj2[key] && typeof obj2[key] === 'object') {
              if (!isOneWayEqual(obj1[key], obj2[key])) {
                return false
              }
            } else if (obj1[key] !== obj2[key]) {
              return false
            }
          }
        }
        return result
      }
    } else if (obj1 === obj2) {
      return true
    }
    return false
  }
  def(Util, 'isEqual', function isEqual (obj1, obj2) {
    return isOneWayEqual(obj1, obj2) && isOneWayEqual(obj2, obj1)
  })
  def(Util, 'prototypeof', function (Class, Interface) {
    if (Class === Interface) {
      return true
    }
    return Object.prototype.isPrototypeOf.call(Interface, Class)
  })
  def(Util, 'instanceof', function (Class, Interface) {
    if (Class === undefined) {
      return false
    }
    if (Class === Interface) {
      return true
    }
    return Class instanceof Interface
      || Interface === String && typeof Class === 'string'
      || Interface === Number && Number.isFinite(Class)
      || Interface === Boolean && typeof Class === 'boolean'
  })
  def(Util, 'typeof', function (Class, Interface) {
    if (Interface === Object) {
      return true
    }
    if (typeof Interface !== 'function') {
      return Util.prototypeof(Class, Interface)
    }
    return Util.instanceof(Class, Interface)
  })
  def(Util, 'isSameOf', function isSameOf (obj, Type, checker) {
    checker = checker || Util
    if (!(obj instanceof Object)) {
      return false
    }
    var result = false
    for (var key in Type) {
      if (Util.hasOwn(Type, key)) {
        result = true
        if (typeof Type[key] === 'object') {
          if (!checker.typeof(obj[key], Type[key]) && !isSameOf(obj[key], Type[key], checker)) {
            return false
          }
        } else if (!checker.typeof(obj[key], Type[key])) {
          return false
        }
      }
    }
    return result
  })
  def(Util, 'checkPattern', function check (value, pattern, checker) {
    checker = checker || Util
    return Util.isEqual(value, pattern)
    || checker.typeof(value, pattern)
    || Util.isSameOf(value, pattern, checker)
    || typeof pattern === 'function' && pattern(value) === true
  })
  def(Util, 'change', function change (tree, removed, newIndex) {
    if (removed > newIndex) {
      for (var i = removed; i > newIndex; i -= 1) {
        tree[i] = tree[i - 1]
      }
    } else if (newIndex > removed) {
      for (var i = removed + 1; i < newIndex; i++) {
        tree[i - 1] = tree[i]
      }
    }
  })
  def(Util, 'getLayer', function getLayer (index) {
    return Math.ceil(Math.log(index + 2) / Math.log(2)) - 1
  })
  def(Util, 'getReverseLayer', function getReverseLayer (index) {
    var layer = 0
    index++
    while (index % 2 == 0) {
      index = index / 2
      layer++
    }
    return layer
  })
  def(Util, 'getColumn', function getColumn (index) {
    var layer = Util.getLayer(index)
    var blocksLength = Math.pow(2, layer)
    return index - (blocksLength -1)
  })
  def(Util, 'atTree', function atTree (index, length) {
    var deepIndex = 2 * Util.getColumn(length - 1)
    if (index - 1 /*(2 - index % 2)*/  >  deepIndex) {
      if (false && index % 2 === 0) {
        return length
      }
      return index - (index - (2 - index % 2) - deepIndex) / 2
    }
    return index
  })
  def(Util, 'toTree', function toTree (index, length) {
    var deepIndex = 2 * Util.getColumn(length - 1)
    if (index - 1 > deepIndex) {
      return index + (index - 1 - deepIndex)
    }
    return index
  })
  def(Util, 'rightIndex', function right (index) {
    var layer = Util.getReverseLayer(index)
    if (layer === 0) {
      return index + 1
    }
    return index + Math.pow(2, layer - 1)
  })
  def(Util, 'leftIndex', function left (index) {
    var layer = Util.getReverseLayer(index)
    if (layer === 0) {
      return index === 0 ? 0 : index - 1
    }
    return index - Math.pow(2, layer - 1)
  })
  def(Util, 'startIndex', function start (length) {
      return Math.ceil(Math.pow(2, Util.getLayer(length - 1)) - 1)
    })
    
  def(Util, 'searchNode', function (arr, id, getNodeId) {
    var index = Util.startIndex(arr.length)
    var max = 2 * (index + 1)
    var limit = index - (max - 1 - arr.length)
    while (max > 1 && (index % 2 === 1 || index / 2 <= limit)) {
      var value = arr[Util.atTree(index, arr.length)]
      var idNode = getNodeId(value)
      if (idNode === id) {
        break
      }
      if (Util.gt(id, idNode)) {
        index = Util.rightIndex(index)
      } else if (index % 2 === 1) {
        index = Util.leftIndex(index)
      }
      max = max / 2
    }
    return Util.atTree(index, arr.length)
  })
  var FatPtr = {
    getId: function getId (index) {
      return this.getNodeId(this.arr[index])
    },
    swap: function swap (leftKey, rightKey) {
      var change = false
      if (Util.gt(this.getId(leftKey), this.getId(rightKey))) {
        leftKey = rightKey
        change = true
      }
      var item = this.arr[leftKey]
      this.arr[leftKey] = this.arr[this.ref]
      this.arr[this.ref] = item
      return change
    },
    new: function (arr, getNodeId, ref, end) {
      var fatPtr = Object.create(FatPtr)
      fatPtr.start = ref || 0
      fatPtr.arr = arr
      fatPtr.ref = fatPtr.start
      fatPtr.getNodeId = getNodeId
      fatPtr.end = end || arr.length
      return fatPtr
    },
    make: function (fatPtr, ref, end) {
      return FatPtr.new(fatPtr.arr, fatPtr.getNodeId, ref, end)
    }
  }
  function merge (fatPtr) {
    var chunkSize = 4
    while (chunkSize / 2 < fatPtr.end - fatPtr.start) {
      change = false
      for (var i = fatPtr.start; i < fatPtr.end - 1; i += chunkSize) {
        var leftKey = i
        var rightKey = i + chunkSize / 2
        var limit = chunkSize / 2
        limit = i + limit > fatPtr.end ? fatPtr.end % chunkSize : limit
        for (var j = 0; j < limit; j++) {
          fatPtr.ref = i + j
          var swapChange = fatPtr.swap(leftKey, rightKey)
          if (swapChange) {
            change = true
            if (fatPtr.ref === leftKey) {
              leftKey = rightKey
            }
            if (rightKey < fatPtr.end - 1) {
              rightKey++
            }
          } else if (fatPtr.ref === leftKey || rightKey - leftKey > 1) {
            leftKey++
          }
        }
        var rightLimit = i + chunkSize > fatPtr.end ? fatPtr.end : i + chunkSize
        var leftLimit = i + chunkSize / 2 > fatPtr.end ? fatPtr.end - 1 : i + chunkSize / 2
        if (rightLimit - rightKey > 0) {
          if (rightKey % 2 === 1) {
            fatPtr.ref = rightKey - 1
            fatPtr.swap(rightKey - 1, rightKey)
          }
          if (leftKey - leftLimit > 0 && leftKey % 2 === 1) {
            fatPtr.ref = leftKey - 1
            fatPtr.swap(leftKey - 1, leftKey)
          }
          if (chunkSize > 4) {
            merge(FatPtr.make(fatPtr, leftLimit, rightLimit))
          }
        } else if (leftKey - leftLimit > 0) {
          if (leftKey % 2 === 1) {
            fatPtr.ref = leftKey - 1
            fatPtr.swap(leftKey - 1, leftKey)
          }
          if (chunkSize > 4) {
            merge(FatPtr.make(fatPtr, leftLimit, rightLimit))
          }
        }
      }
      if (!change && chunkSize > 4 && chunkSize < fatPtr.end) {
        for (var i = chunkSize; i < fatPtr.end ; i += chunkSize) {
          if (Util.gt(fatPtr.getId(i - 1), fatPtr.getId(i))) {
            change = true
            break
          }
        }
        if (!change) {
          return
        }
      }
      chunkSize = 2 * chunkSize
    }
  }
  def(Util, 'sort', function (arr, getNodeId) {
    var ordered = []
    var fatPtr = FatPtr.new(ordered, getNodeId, 0, arr.length)
    for (var i = 0; i < arr.length; i++) {
      ordered.push(arr[i])
      if (i % 2 === 1) {
        fatPtr.ref = i - 1
        fatPtr.swap(i - 1, i)
      }
    }
    merge(fatPtr)
    return ordered
  })
  return Util
}
Object.defineProperty(this, 'Util', {value: createUtilLib()})
