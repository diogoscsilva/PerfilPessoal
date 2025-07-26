"use strict"
Proto.module('DataTypes', function (imports) {

  var Generic = imports.Generic.Generic
  var Ref = imports.Ref.Ref
  var TypeRef = imports.Ref.TypeRef
  var GenericRef = imports.Ref.GenericRef
  var Task = imports.Task.Task
  var Iterable = imports.ObjectIterator.Iterable
  var ObjectMethods = imports.ObjectIterator.ObjectMethods
  var Box = imports.Box.Box
  var TypeBox = imports.Box.TypeBox
  var TypeContainer = imports.Box.TypeContainer
  var BoxContainer = imports.Box.BoxContainer
  var InBoxContainer = imports.Box.InBoxContainer
  var JustBoxContainer = imports.Box.JustBoxContainer
  var DataClass = imports.DataProxy.DataClass

  var ADT = Proto.interface('ADT', function () {
    var tupleManager = {
      newObj: Util.noItem,
      getKey: Util.pass,
      getItem: Util.pass,
      Type: Tuple
    }
    var recordManager = {
      newObj: Util.noProp,
      getKey: function (i, arr) {
        var key = arr[i][0]
        if (/^"[\w\d_]+"$/.test(key)) {
          return key.slice(1, -1)
        }
        return key
      },
      getItem: function (pair) {
        return pair[1]
      },
      Type: Record
    }
    function productConteiner (arr, obj, manager) {
      var parsed = manager.newObj()
      var Type = obj.getType()
      obj = obj.default
      for (var i = 0; i < arr.length; i++) {
        parsed[manager.getKey(i, arr)] = parseADT(manager.getItem(arr[i]), Type)
      }
      return obj.make(parsed)
    }
    function product (arr, obj, manager) {
      var parsed = manager.newObj()
      if (Proto.interfaceof(obj, TypeBox)) {
        obj = obj.hasAbstraction() ? obj.default : obj.getType()
      }
      if (!Proto.interfaceof(obj, ProductDT)) {
        obj = manager.Type.init()
      } else if (!Util.hasOwn(obj, '_this')) {
        obj = obj.init()
      }
      var types = Proto.getClassOf(obj).getTypes.call(obj)
      for (var i = 0; i < arr.length; i++) {
        parsed[manager.getKey(i, arr)] = parseADT(manager.getItem(arr[i]), Proto.interfaceof(types[manager.getKey(i, arr)] , TypeBox) && types[manager.getKey(i, arr)] || obj[manager.getKey(i, arr)])
      }
      return obj.make(parsed)
    }
    function translate (type, code) {
      var str = ''
      var opens = 0
      var types = []
      var translators = {
        Tuple: function ($0) {
          if (!$0 || ADT.comment_re.test($0)) {
            return ''
          }
          if (($0 !== ',' && $0 !== ']' || opens > 1) && ($0 !== '[' || opens > 0)) {
            if ($0 === ',') {
              str += $0 + ' '
            } else {
              str += $0
            }
          }
          if ($0 === '(' || $0 === '{' || $0 === '[') {
            opens++
          } else if ($0 === ')' || $0 === '}' || $0 === ']') {
            opens--
          }
          if (str !== '' && (opens === 0 && $0 === ']' || opens === 1 && $0 === ',')) {
            types.push(str)
            str = ''
          }
        },
        Record: function ($0) {
          if (!$0 || ADT.comment_re.test($0)) {
            return ''
          }
          if (($0 !== '}' && $0 !== ',' && $0 !== ':' || opens > 1) && ($0 !== '{' || opens > 0)) {
            if ($0 === ',') {
              str += $0 + ' '
            } else {
              str += $0
            }
          }
          if ($0 === '(' || $0 === '{' || $0 === '[') {
            opens++
          } else if ($0 === ')' || $0 === '}' || $0 === ']') {
            opens--
          }
          if (opens === 1 && $0 === ':') {
            types.push([str])
            str = ''
          } else if (opens === 0 && $0 === '}' || opens === 1 && $0 === ',') {
            if (types.length > 0) {
              types[types.length - 1].push(str)
            }
            str = ''
          }
        },
        NamedType: function ($0) {
          if (!$0 || ADT.comment_re.test($0)) {
            return ''
          }
          if (($0 !== ')' && $0 !== ',' || opens > 1) && ($0 !== '.' && $0 !== '(' || opens > 0)) {
            if ($0 === ',') {
              str += $0 + ' '
            } else {
              str += $0
            }
          }
          if ($0 === '(' || $0 === '{' || $0 === '[') {
            opens++
          } else if ($0 === ')' || $0 === '}' || $0 === ']') {
            opens--
          }
          if (opens === 0 && $0 === ')' && str) {
            types[1] = str
            str = ''
          } else if (opens === 1 && ($0 === '(' || $0 === ',')) {
            types[2] = str
            str = ''
          } else if (opens === 0 && str && !types[0]) {
            types[0] = str
            str = ''
          }
        },
        String: function ($0) {
          types[0] = $0
        },
        Number: function ($0) {
          if (types.length === 0) {
            types[0] = $0
          } else {
            types[0] += $0
          }
        },
        Boolean: function ($0) {
          types[0] = $0
        }
      }
      types = []
      code.replace(ADT.code_re, translators[type])
      if (str !== '' || opens !== 0) { throw new TypeError('invalide type') }
      return types
    }
    var parses = {
      Tuple: function (arr, obj) {
        tupleManager.Type = Tuple
        if (Proto.interfaceof(obj, TypeContainer)) {
          return productConteiner(arr, obj, tupleManager)
        }
        return product(arr, obj, tupleManager)
      },
      Record: function (arr, obj) {
        recordManager.Type = Record
        if (Proto.interfaceof(obj, TypeContainer)) {
          return productConteiner(arr, obj, recordManager)
        }
        return product(arr, obj, recordManager)
      },
      NamedType: function (arr, obj, code) {
        var parsed
        if (typeof obj === 'object') {
          if (Proto.interfaceof(obj, TypeBox)) {
            obj = obj.hasAbstraction() ? obj.default : obj.getType()
          }
          if (Proto.interfaceof(obj, SumDT)) {
            if (!Util.hasOwn(obj, '_this')) {
              obj = obj.of()
            }
            var typeName = arr[2] || arr[0]
            if (arr.length > 2) {
              var EnumType = obj.EnumTypes[typeName]
                parsed = obj[typeName](parseADT(arr[1], EnumType))
            } else {
              parsed = obj[typeName]()
            }
          } else if (Proto.interfaceof(obj, ProductDT)) {
            if (arr.length > 2) {
              parsed = obj.make(parseADT(arr[1], obj))
            }
          }
        } else if (typeof obj === 'string') {
          return code
        }
        return parsed
      },
      String: function (arr) {
        return arr[0].slice(1, -1).replace(/\\"/g, '"')
      },
      Number: function (arr) {
        return Number(arr[0])
      },
      Boolean: function (arr) {
        return Boolean(arr[0])
      }
    }
    function parseADT (code, obj) {
      if (code === '') {
        return obj
      }
      if (typeof code === 'string') {
        var type = ADT.typeofEntity(code)
        var parsed = parses[type](translate(type, code), obj, code)
        return parsed
      }
      return code
    }
    return {
      toString: undefined,
      make: undefined,
      parse: function parse (str) {
        if (Proto.isExtendedInstance(this)) {
          throw this + new TypeError(" is not typed")
        }
        return parseADT(str, this)
      },
      typeofEntity: function typeofEntity (typeStr) {
        if (typeStr.charAt(0) === '[') {
          return 'Tuple'
        } else if (typeStr.charAt(0) === '{') {
          return 'Record'
        } else if (typeStr.charAt(0) === '(') {
          return 'Enum'
        } else if (typeStr.charAt(0) === '"') {
          return 'String'
        } else if (/^-?\d*\.?\d+$/.test(typeStr)) {
          return 'Number'
        } else if (typeStr === 'false' || typeStr === 'true') {
          return 'Boolean'
        }
        return 'NamedType'
      },
      adjustString (str) {
        if (Proto.instanceof(str, String)) {
          return '"'  + str.replace(/"/g, '\\"') +  '"'
        } else if (typeof str === 'object') {
          return Object.getPrototypeOf(str).toString.call(str)
        }
        return str
      },
      create: function create (name, createExtendedType) {
        return Proto.class(name, function (global) {
          var ExtendedType = createExtendedType(global) || {}
          ExtendedType.parse = function (str) {
            return parseADT(str, this)
          }
          return ExtendedType
        })
      },
      isCompatible: function isCompatible (item) {
        if (typeof item === 'object') {
          if (Proto.interfaceof(item, ADT)) {
            return true
          }
        } else {
          if (Number.isFinite(item)) {
            return true
          }
          var type = typeof item
          if (type === 'boolean'
            || type === 'string') {
            return true
          }
        }
        return false
      },
      assertCompatible: function assertCompatible(item) {
        if (!ADT.isCompatible(item)) {
          throw new SyntaxError("Item " + item + " is not compatible")
        }
      },
      code_re: /\/\/[^\n\r]*(?:\r(?:\n)?|\n)|\/\*(?:(?:[^*]*|\*[^\/])*|\*)\*\/|[”"](?:\\[”"]|[^”"])*[”"]|-\s*\d+|\w+|[\[\]{}(,.:)]/g,
      comment_re: /\/\/[^\n\r]*(?:\r(?:\n)?|\n)|\/\*(?:(?:[^*]*|\*[^\/])*|\*)\*\//
    }
  })
  var ProductDT = Proto.interface('ProductDT', function (global) {
    global.extends([ADT])
    function copyProductItem (item, newItem) {
      if (item !== newItem && Proto.interfaceof(item, ProductDT)) {
        if (!Proto.isCreatedByProto(newItem)) {
          return item.make(newItem)
        }
      } else if (newItem === undefined) {
        return item
      }
      return newItem
    }
    function checkProductItem (item, newItem) {
      if (newItem === undefined) {
        return true
      } else if (item !== newItem && Proto.interfaceof(item, ProductDT)) {
        return true
      } else if (Proto.prototypeof(item, Enum)) {
        if (Generic.prototypeof(newItem, Generic.getClassOf(item))) {
          return true
        }
      } else if (typeof newItem === typeof item) {
        return true
      }
      return false
    }
    function getDefault (instance) {
      return Util.hasOwn(instance, '_this') && instance || instance.init()
    }
    return {
      getItemType: function getItemType (item) {
        if (Proto.interfaceof(item, TypeBox)) {
            return item
        } else if (Proto.interfaceof(item, ADT)) {
          if (Util.hasOwn(item, '_this')) {
            return Generic.getClassOf(item)
          }
          return item
        } else if (Proto.instanceof(item, Boolean)) {
          return Boolean
        } else if (Proto.instanceof(item, String)) {
          return String
        } else if (Proto.instanceof(item, Number)) {
          return Number
        }
        throw new TypeError('Incompatible item')
      },
      constItem: function constItem(item, key) {
        ADT.assertCompatible(item)
        Util.final(this, key, item)
      },
      varItem: function varItem(item, key) {
        if (Proto.prototypeof(item, DataClass.ConstValue)) {
          return ProductDT.constItem.call(this, item.value, key)
        }
        ADT.assertCompatible(item)
        Util.var(this, key, item)
      },
      copyItem: function copyItem (item, key, source) {
        if (!checkProductItem(item, this[key])) {
          throw new TypeError('Incompatible ' + typeof item + ' item ' + item + ' of key ' + key + ' in the type ' + Proto.getClassOf(source).class.name)
        }
        return copyProductItem(item, this[key])
      },
      boxOf: function boxOf (Type) {
        return BoxContainer.of(Type).with(getDefault(this))
      },
      inBoxOf: function inBoxOf (Type) {
        return InBoxContainer.of(Type).with(getDefault(this))
      },
      justBoxOf: function justBoxOf (Type) {
        return JustBoxContainer.of(Type).with(getDefault(this))
      },
      getTypes: function getTypes () {
        var _this = global.private(this)
        if (!_this.types) {
          _this.types = ObjectMethods.map.call(this, function (item) {return ProductDT.getItemType(item)})
        }
        return _this.types
      },
      isEmpty: function isEmpty () {
        return this === Proto.getClassOf(this).void
      },
      isEqual: function isEqual (obj) {
        return Util.isEqual(this, obj)
      },
      init: function init (obj) {
        if (obj !== undefined) {
          for (var key in obj) {
            return this.new(obj)
          }
        }
        return this.void
      },
      make: function make (obj) {
        if (!obj) {
          return this
        }
        var Type = Proto.getClassOf(this)
        if (this !== Type.void) {
          obj = Type.map.call(this, Type.copyItem, obj)
        }
        if (Proto.interfaceof(Type, Generic)) {
          return Type.of(Generic.getType.call(this), [obj])
        }
        return Type.init(obj)
      }
    }
  })

  var SumDT = Proto.interface('SumDT', function (global) {
    global.extends([ADT, Generic])

    var SubTypeInterface = Proto.interface('SubTypeInterface', function (global) {
      global.extends([Generic])
      return {
        matched: function matched (fn) {
          return fn()
        },
        init: function init (value) {
          var typeValue = Generic.getType.call(this)
          if (!Proto.prototypeof(typeValue, DataClass.ConstValue) && !TypeBox.typeof(value, typeValue)) {
            throw new TypeError('Invalid type ' + Generic.getName(value) + ', expected ' + Generic.getName(typeValue))
          }
          return Proto.getClassOf(this).of(typeValue, [value])
        }
      }
    })
    var EmptySubType = Proto.class('EmptySubType', function (global) {
      global.implements([SubTypeInterface])
    })
    var emptySubType = EmptySubType.new()
    var SubType = Proto.class('SubType', function (global) {
      global.implements([SubTypeInterface])
      return {
        new: function newFn (value) {
          var _this = global.private(this)
          _this.value = value
        },
        matched: function matched (fn) {
          return fn(global.private(this).value)
        }
      }
    })

    function setSubType (typeName, arg) {
      var _this = global.private(this)
      var entries = this.entries
      if (!Util.hasOwn(entries, typeName)) {
        throw new TypeError(this.class.name + ' has not ' + typeName + ' subType')
      }
      var typeValue = this.EnumTypes[typeName]
      if (typeValue) {
        _this.typeObj = SubType.of(typeValue).init(arg)
      } else {
        _this.typeObj = emptySubType
      }
      var Target = entries[typeName][1]
      _this.target = Target && Target.new(this)
      _this.typeName = typeName
      return this
    }

    function getSubtypes (entries, Type) {
      var EnumTypes = {}
      ObjectMethods.forEach.call(entries, function (enumType, typeName) {
        Util.def(EnumTypes, typeName, Proto.prototypeof(enumType[0], Ref) ? Type : enumType[0])
      })
      return EnumTypes
    }

    function checkTypeEnum (value, Type) {
      if (!TypeBox.typeof(value, Type)) {
        throw new TypeError('Invalid type ' + Generic.getName(Generic.getType.call(value)) + ', expected ' + Generic.getName(Type))
      }
    }


    return {
      entries: Util.pseudo,
      init: function init (typeName, arg) {
        var instance = this.new()
        return setSubType.call(instance, typeName, arg)
      },
      delegate: function delegate (methodName) {
        return function delegate () {
          var _this = global.private(this)
          return _this.target[methodName].apply(_this.target, arguments)
        }
      },
      delegatePseudo: function delegatePseudo (propName) {
        return {
          get: function getFn () {
            var _this = global.private(this)
            return _this.target[propName]
          },
          set: function setFn (value) {
            var _this = global.private(this)
            _this.target[propName] = value
          },
          enumerable: true
        }
      },
      isKindOf: function isKindOf(name) {
        var _this = global.private(this)
        return name === _this.typeName
      },
      force: function force(typeName) {
        var _this = global.private(this)
        var typeObj = _this.typeObj || emptySubType
        if (_this.typeName === typeName) {
          return typeObj.matched(function (value) {return value})
        }
        throw new TypeError('Wrong subtype ' + typeName + ' in Enum ' + this.class.name + '.')
      },
      get: function getFn (Type, actions) {
        var result = SumDT.match.call(this, actions)
        checkTypeEnum(result, Type)
        return result
      },
      resolve: function resolve (Type, actions) {
        return Task.resolve(SumDT.match.call(this, actions)).then(function (result) {
          checkTypeEnum(result, Type)
          return result
        })
      },
      match: function match (actions) {
        var _this = global.private(this)
        var typeObj = _this.typeObj || emptySubType
        var typeName = _this.typeName
        if (Util.hasOwn(actions, typeName)) {
          return typeObj.matched(actions[typeName])
        } else if (Util.hasOwn(actions, 'default')) {
          return typeObj.matched(actions.default)
        }
        throw new RangeError('There is no action for the subtype ' + _this.typeName + ' of the Enum ' + this.class.name + '.')
      },
      get EnumTypes () {
        var _this = global.private(this)
        _this.EnumTypes = _this.EnumTypes || getSubtypes(Proto.getClassOf(this).entries, this.getType())
        return _this.EnumTypes
      },
      make: function make (typeName, arg) {
        var Type = Generic.getType.call(this)
        var instance = Proto.getClassOf(this).of(Type)
        return setSubType.call(instance, typeName, arg)
      },
      makeSame: function makeSame (arg) {
        var typeName = global.private(this).typeName
        return this.make(typeName, arg)
      },
      toString: function toString () {
        var _this = global.private(this)
        var str = ''
        str += _this.typeName || ''
        SumDT.match.call(this, {
          default: function (value) {
            if (value !== undefined) {
              str += '('
              str += ADT.adjustString(value)
              str += ')'
            }
          }
        })
        return str
      }
    }
  })
  var Enum = Proto.lib('Enum', function (global) {
    global.implements([SumDT])

    var SubTypeCreator = Proto.class('SubTypeCreator', function (global) {
      function creator () {
        var _this = global.private(this)
        return function (value) {
          if (!Util.hasOwn(this, '_this')) {
            return this.init(_this.typeName, value)
          }
          return this.make(_this.typeName, value)
        }
      }
      function emptyCreator (creator) {
        var Consts = {}
        return function (value) {
          if (value !== undefined) {
            return creator.call(this, value)
          }
          var typeId = Generic.getName(Generic.getType.call(this))
          if (Util.hasOwn(Consts, typeId)) {
            return Consts[typeId]
          }
          Consts[typeId] = creator.call(this)
          return Consts[typeId]
        }
      }
      function constCreator (creator, constWrapper) {
        var Consts = {}
        return function () {
          var typeId = Generic.getName(Generic.getType.call(this))
          if (Util.hasOwn(Consts, typeId)) {
            return Consts[typeId]
          }
          Consts[typeId] = creator.call(this, constWrapper.value)
          return Consts[typeId]
        }
      }
      return {
        new: function newFn (typeName) {
          var _this = global.private(this)
          _this.typeName = typeName
          _this.creator = creator.call(this)
        },
        get make () {
          var _this = global.private(this)
          return function make (value) {
            return _this.creator.call(this, value)
          }
        },
        getCreator: function getCreator (typeName, typeValue) {
          var creator = SubTypeCreator.new(typeName)
          if (!typeValue) {
            creator.setEmptyCreator()
          } else if (Proto.prototypeof(typeValue, DataClass.ConstValue)) {
            creator.setConstCreator(typeValue)
          }
          return creator
        },
        setEmptyCreator: function setEmptyCreator () {
          var _this = global.private(this)
          _this.creator = emptyCreator(_this.creator)
        },
        setConstCreator: function setConstCreator (constWrap) {
          var _this = global.private(this)
          _this.creator = constCreator(_this.creator, constWrap)
        }
      }
    })

    var seal = global.seal

    function createSubClass (name, typeName, interfaces) {
     return Proto.class('SubType.' + name + '.' + typeName, function (global) {
        global.implements(interfaces)
        return {
          new: function newFn (enumType) {
            Util.def(this, 'enum', enumType)
          }
        }
      })
    }
    
    function delegate (shadow) {
      return function delegate () {
        return shadow.value.apply(this.enum, arguments)
      }
    }

    function delegatePseudo (shadowPseudo) {
      return {
        get: function getFn () {
          return shadowPseudo.get.call(this.enum)
        },
        set: function setFn (value) {
          shadowPseudo.get.call(this.enum, value)
        },
        enumerable: true
      }
    }

    function createShadowMethods (interfaces) {
      var methods = {}
      for (var i = 0; i < interfaces.length; i++) {
        var Interface = interfaces[i]
        for (var propName in Interface) {
          if (Util.hasOwn(Interface, propName) && !Util.hasOwn(methods, propName)) {
            methods[propName] = Object.getOwnPropertyDescriptor(Interface, propName)
          }
        }
      }
      return methods
    }

    function createProxyInterface (name, enumTypesCopy, interfaces) {
      interfaces = interfaces || []
      var shadowMethods = createShadowMethods(interfaces)
      var methods = {new: undefined, class: undefined}
      var subMethods = {}
      for (var i = 0; i < enumTypesCopy.length; i++) {
        var subInterfaces = enumTypesCopy[i][2]
        if (subInterfaces) {
          for (var j = 0; j < subInterfaces.length; j++ ) {
            var subInterface = subInterfaces[j]
            for (var propName in subInterface) {
              if (Util.hasOwn(subInterface, propName)
              && !Util.hasOwn(methods, propName)) {
                var discriptor = Object.getOwnPropertyDescriptor(subInterface, propName)
                if (Util.hasOwn(discriptor, 'value')) {
                  if (typeof discriptor.value === 'function') {
                    methods[propName] = SumDT.delegate(propName)
                    subMethods[propName] = delegate(shadowMethods[propName])
                  } else {
                    Object.defineProperty(methods, propName, SumDT.delegatePseudo(propName))
                    Object.defineProperty(subMethods, propName, delegatePseudo({get: function () {return shadowMethods[propName]}}))
                  }
                } else {
                  Object.defineProperty(methods, propName, SumDT.delegatePseudo(propName))
                  Object.defineProperty(subMethods, propName, delegatePseudo(shadowMethods[propName]))
                }
              }
            }
          }
        }
      }
      var SubProxyInterface = Proto.interface(name + 'SubProxyInterface', function () {
        return subMethods
      })
      var defaultSubClass
      enumTypesCopy.forEach(function (enumType) {
        var typeName = enumType[0]
        var interfaces = enumType[2]
        if (interfaces) {
          enumType[3] = createSubClass(name, typeName, interfaces.concat(SubProxyInterface))
        } else {
          defaultSubClass = defaultSubClass || createSubClass(name, '', [SubProxyInterface])
          enumType[3] = defaultSubClass
        }
      })
      delete methods.class
      delete methods.new
      return Proto.interface(name + 'ProxyInterface', function () {
        return methods
      })
    }

    function hasSubType (enumTypes) {
      return enumTypes.some(function (enumType) {
        if (Proto.prototypeof(enumType, Enum)) {
          return hasSubType(enumType.getEnumTypes(seal.private))
        }
        return enumType[2] && true
      })
    }

    function makeEnumCreators (name, ExtendedEnum, enumTypes, enumTypesCopy) {
      for (var i = 0; i < enumTypes.length; i++) {
        var typeName = enumTypes[i][0]
        if (Proto.prototypeof(enumTypes[i], Enum)) {
          makeEnumCreators(name, ExtendedEnum, enumTypes[i].getEnumTypes(seal.private), enumTypesCopy)
        } else if (!ExtendedEnum.hasOwnProperty(typeName)) {
          var typeValue = enumTypes[i][1]
          var subTypeInterfaces = (enumTypes[i][2] || [])
          var creator = SubTypeCreator.getCreator(typeName, typeValue)
          ExtendedEnum[typeName] = creator.make
          enumTypesCopy.push([typeName, typeValue])
          if (subTypeInterfaces) {
            var subInterfaces = subTypeInterfaces instanceof Array && subTypeInterfaces ||  [DataClass.createInterface(name + '.' + typeName, subTypeInterfaces)]
            enumTypesCopy[enumTypesCopy.length - 1] = [typeName, typeValue, subInterfaces]
          }
        }
      }
    }
    return {
      const: DataClass.const,
      create: function createClass (name, enumTypes, interfacesList, extensions) {
        var entries
        var ExtendedEnum = {
          getEnumTypes : function getEnumTypes (privateSeal) {
            global.seal.private(privateSeal)
            return enumTypesCopy
          },
          get entries () {
            if (!entries) {
              entries = {}
              var thisEnum = this
              enumTypesCopy.forEach(function (enumType) {
                entries[enumType[0]] = [Proto.prototypeof(enumType[1], Ref) ? enumType[1].get(thisEnum, enumType[1]) : enumType[1], enumType[3]]
              })
              Object.freeze(entries)
            }
            return entries
          },
          implements: function implementsFn (name, interfaces, extensions) {
            return createClass(name, enumTypes, interfaces, extensions)
          },
          extends: function extendsFn (name, interfaces, extensions) {
            extensions = extensions || []
            return createClass(name, enumTypes, interfaces, extensions.concat(interfacesList))
          }
        }
        var enumTypesCopy = []
        interfacesList = DataClass.extendInterfaces(name, interfacesList, extensions)
        var subTypes = hasSubType(enumTypes)
        makeEnumCreators(name, ExtendedEnum, enumTypes, enumTypesCopy, subTypes && (interfacesList || []))
        var ProxyInterface = subTypes && createProxyInterface(name, enumTypesCopy, interfacesList)
        if (ProxyInterface) {
          if (!interfacesList) {
            interfacesList = []
          }
          interfacesList.unshift(ProxyInterface)
        }
        return ADT.create(name, function (global) {
          global.extends(Enum)
          global.implements(interfacesList)
          ExtendedEnum.new = function newFn () {
            global.super(global.of(this) && seal.private)
          }
          return ExtendedEnum
        })
      },
    }
  })
  var ExtendedProduct = Proto.lib('ExtendedProduct', function() {
    function boxItem (item) {
      if (!Proto.interfaceof(item, TypeBox)) {
        item = Box.of(ProductDT.getItemType(item)).with(item)
      }
      return item
    }
    function varItem (item) {
      if (Proto.prototypeof(item, Ref)) {
        var refItem = item
        item = Proto.getClassOf(item).new(function (Type, GenericType) {
          var resolved = refItem.get(Type, GenericType)
          return boxItem(resolved)
        })
      } else {
        item = boxItem(item)
      }
      return item
    }
    function constItem (item) {
      return DataClass.const(varItem(item))
    }
    function getTypes (Class, objTypes) {
      var Types = {}
      for (var propName in objTypes) {
        if (Util.hasOwn(objTypes, propName) && propName !== '__proto__'){
          var item = objTypes[propName]
          if (Proto.prototypeof(item, Ref)) {
            if (Proto.prototypeof(item, TypeRef)) {
              Types[propName] = item.get(Class)
            } else {
              Types[propName] = item.get(undefined, Generic.getType.call(Class))
            }
          } else {
            Types[propName] = ProductDT.getItemType(item)
          }
        }
      }
      return Types
    }
    return {
      setupInterfaces: function setupInterfaces (name, objTypes, interfaces, extensions) {
        var typesCache
        var TypeInterface = DataClass.createInterface(name + 'Type', {
          getTypes () {
            typesCache = typesCache || getTypes(Generic.getClassOf(this), objTypes)
            return typesCache
          }
        })
        if (!Proto.instanceof(interfaces, Array)) {
          interfaces = [DataClass.createInterface(name, interfaces, extensions)]
        }
        interfaces = interfaces.concat([TypeInterface])
        return interfaces
      },
      setupConstArgs: function setupConsatArgs (objTypes) {
        var args = []
        for (var propName in objTypes) {
          if (Util.hasOwn(objTypes, propName)){
            args.push([propName, constItem(objTypes[propName])])
          }
        }
        return args
      },
      setupVarArgs: function setupVarArgs (objTypes) {
        var args = []
        for (var propName in objTypes) {
          if (Util.hasOwn(objTypes, propName)){
            if (Proto.prototypeof(objTypes[propName], DataClass.ConstValue)) {
              args.push([propName, constItem(objTypes[propName].value)])
            } else {
              args.push([propName, varItem(objTypes[propName])])
            }
          }
        }
        return args
      }
    }
  })
  var RecordMethods = Proto.interface('RecordMethods', function (global) {
    global.extends([ProductDT, ObjectMethods])
    return {
      assign: function assign (obj) {
        return Proto.getClassOf(this).init(ObjectMethods.assign.call(this, obj))
      },
      toString: function newFn () {
        var str = ''
        for (var key in this) {
          if (Util.hasOwn(this, key)) {
            str += ', ' + key + ': '
            str += ADT.adjustString(this[key])
          }
        }
        return '{' + str.slice(2) + '}'
      }
    }
  })
  var Record = Proto.sealed('Record', function (global) {
    global.implements([RecordMethods])
    global.static = function(Record) {
      Record.void = Record.new({})
    }
    return {
      create: function create (name, objTypes, interfaces, extensions) {
        interfaces = ExtendedProduct.setupInterfaces(name, objTypes, interfaces, extensions).concat(RecordMethods)
        var args = ExtendedProduct.setupConstArgs(objTypes)
        return DataClass.create(name, args, interfaces)
      },
      new: function newFn (obj) {
        ObjectMethods.forEach.call(obj, ProductDT.constItem, this)
      }
    }
  })
  var MutableMethods = Proto.interface('MutableMethods', function () {
    function setItem (item, key) {
      this[key] = item
    }
    return {
      set: function setFn (obj) {
        ObjectMethods.forEach.call(obj, setItem, this)
      }
    }
  })
  var Dict = Proto.sealed('Dict', function (global) {
    global.implements([MutableMethods, RecordMethods])
    global.static = function(Dict) {
      Dict.void = Dict.new({})
    }
    return {
      const: DataClass.const,
      create: function create (name, objTypes, interfaces, extensions) {
        interfaces = ExtendedProduct.setupInterfaces(name, objTypes, interfaces, extensions).concat([MutableMethods, RecordMethods])
        var args = ExtendedProduct.setupVarArgs(objTypes)
        return DataClass.create(name, args, interfaces)
      },
      new: function newFn (obj) {
        ObjectMethods.forEach.call(obj, ProductDT.varItem, this)
      }
    }
  })
  var ListIterable = Proto.interface('ListIterable', function (global) {
    global.extends([Iterable])
    function mapCallbackTasksToObject (callback) {
      return function taskCallback (item, key, source) {
        return Task.resolve(callback.call(this, item, key, source))
      }
    }
    return {
      toArray: function toArray () {
        return ListIterable.map.call(this, function (item) {return item})
      },
      getItem: function getItem (index) {
        return this[index]
      },
      hasNext: function hasNext (index) {
        return index < this.length
      },
      incrementIndex: function incrementIndex (index) {
        return index >= 0 && index + 1 || 0
      },
      asyncMap: function asyncMap(callback, objThis) {
        var taskCallback = mapCallbackTasksToObject(callback)
        return Task.all(ListIterable.map.call(this, taskCallback ,objThis))
      },
      asyncForEach: function asyncForEach (callback, objThis) {
        return ListIterable.asyncMap.call(this, callback, objThis)
        .then(function () {})
      },
      map: function map (callback, objThis) {
        if (!Proto.interfaceof(this, ListIterable)) {
          return ObjectMethods.map.call(this, callback, objThis)
        }
        var source = this
        var object = []
        for (var i = 0; i < this.length; i += 1) {
          var item = this.getItem(i)
          var key = i
          object[key] = callback.call(objThis || {}, item, key, source)
        }
        return object
      },
      forEach: function forEach (callback, objThis) {
        ListIterable.map.call(this, callback, objThis)
      },
      [Symbol.iterator]: function iteratorFn () {
        var index = 0
        var iterator = this
        return {
          next: function () {
            if (index < iterator.length) {
              return {
                value: iterator.getItem(index++),
                done: false
              }
            }
            return { done: true }
          }
        }
      }
    }
  })
  var ListMethods = Proto.interface('ListMethods', function (global) {
    global.extends([ListIterable])
    return {
      concat: function concat () {
        return Proto.getClassOf(this).init(this.toArray().concat(arguments))
      },
      at: function at (index) {
        return index < 0 ? this[this.length - index] : this[index]
      },
      slice: function slice (start, len) {
        var array = []
        for (var i = start; i < len; i++) {
          array.push(this.getItem(i))
        }
        return Proto.getClassOf(this).init(array)
      },
      filter: function filter (callback, thisObj) {
        var filtered = []
        ListIterable.forEach.call(this, function(item) {
          if (callback(item)) {
            filtered.push(item)
          }
        }, thisObj)
        return Proto.getClassOf(this).init(filtered)
      },
      some: function some (callback, thisObj) {
        thisObj = thisObj || this
        for (var i = 0; i < this.length; i++) {
          if (callback.call(thisObj, this.getItem(i))) {
            return true
          }
        }
        return false
      },
      every: function every (callback, thisObj) {
        thisObj = thisObj || this
        for (var i = 0; i < this.length; i++) {
          if (!callback.call(thisObj, this.getItem(i))) {
            return false
          }
        }
        return true
      },
      includes: function includes (element, start) {
        return ListMethods.indexOf.call(this, element, start) > -1
      },
      indexOf: function indexOf (element, start) {
        for (var i = start || 0; i < this.length; i++) {
          if (this.getItem(i) === element) {
            return i
          }
        }
        return -1
      },
      lastIndexOf: function lastIndexOf (element, start) {
        start = start || 0
        for (var i = this.length - 1; i >= start; i--) {
          if (this.getItem(i) === element) {
            return i
          }
        }
        return -1
      },
      findIndex: function findIndex (callback, thisObj) {
        thisObj = thisObj || this
        for (var i = 0; i < this.length; i++) {
          if (callback.call(thisObj, this.getItem(i))) {
            return i
          }
        }
        return -1
      },
      findLastIndex: function findLastIndex (callback, thisObj) {
        thisObj = thisObj || this
        for (var i = this.length - 1; i >= 0; i--) {
          if (callback.call(thisObj, this.getItem(i))) {
            return i
          }
        }
        return -1
      },
      assign: function assign (obj) {
        var newArr = this.toArray()
        if (Proto.interfaceof(obj, ListIterable)) {
          ListIterable.forEach.call(obj, function (item, key) {
            if (Proto.instanceof(Number(key), Number) && item !== undefined) {
              newArr[key] = item
            }
          })
        } else {
          for (var propName in obj) {
            if (Util.hasOwn(obj, propName) && Proto.instanceof(Number(propName), Number) && obj[propName] !== undefined) {
              newArr[propName] = obj[propName]
            }
          }
        }
        return newArr
      },
      join: function join (separator) {
        if (this.length === 0) {
          return ''
        }
        var str = this.getItem(0).toString()
        for (var i = 1; i < this.length; i++) {
          str += separator + this.getItem(0).toString()
        }
        return str
      }
    }
  })
  var TupleMethods = Proto.interface('TupleMethods', function (global) {
    global.extends([ProductDT, ListMethods])
    return {
      assign: function assign (obj) {
        return Proto.getClassOf(this).init(ListMethods.assign.call(this, obj))
      },
      toString: function toString () {
        var str = ''
        for (var i = 0; i < this.length; i++) {
          str += ', '
          str += ADT.adjustString(this[i])
        }
        return '[' + str.slice(2) + ']'
      }
    }
  })
  var Tuple = Proto.sealed('Tuple', function (global) {
    global.implements([TupleMethods])
    global.static = function(Tuple) {
      Tuple.void = Tuple.new({})
    }
    return {
      create: function create (name, objTypes, interfaces, extensions) {
        interfaces = ExtendedProduct.setupInterfaces(name, objTypes, interfaces, extensions).concat(TupleMethods)
        var args = ExtendedProduct.setupConstArgs(objTypes)
        args.push(['length', DataClass.def({value: args.length})])
        return DataClass.create(name, args, interfaces)
      },
      new: function newFn (arr) {
        ListIterable.forEach.call(arr, ProductDT.constItem, this)
        Util.def(this, 'length', arr.length || 0)
      }
    }
  })
  var List = Proto.sealed('List', function (global) {
    global.implements([MutableMethods, TupleMethods])
    global.static = function(List) {
      List.void = List.new({})
    }
    return {
      create: function create (name, objTypes, interfaces, extensions) {
        interfaces = ExtendedProduct.setupInterfaces(name, objTypes, interfaces, extensions).concat([MutableMethods, TupleMethods])
        var args = ExtendedProduct.setupVarArgs(objTypes)
        args.push(['length', DataClass.def({value: args.length})])
        return DataClass.create(name, args, interfaces)
      },
      new: function newFn (arr) {
        ListIterable.forEach.call(arr, ProductDT.varItem, this)
        Util.def(this, 'length', arr.length || 0)
      }
    }
  })
  var RangeMethods = Proto.interface('RangeMethods', function (global) {
    global.extends([ListIterable])
    return {
      newSameTypeOfList: function newSameTypeOfList (array, list) {
        if (Proto.prototypeof(list, Tuple)) {
          return Proto.getClassOf(list).init(array)
        } else if (Array.isArray(list)) {
          return array
        }
        return new list.constructor(array)
      },
      set: function setFn (start, end, step) {
        var setup = Util.setupRange(start, end, step)
        if ((setup.step > 0 && setup.end < setup.start)
        || (setup.step < 0 && setup.start < setup.end)) {
          return this.init()
        }
        return this.init(setup)
      },
      getItem: function getItem (index) {
        if (index < this.length) {
          return this.start + this.step * index
        }
      },
      hasNext: function hasNext (index) {
        return index < this.length
      },
      slice: function slice (index, length) {
        index = index < 0 ? this.length + index : index
        length = length < 0 ? this.length + length : length
        var end = length !== undefined && length * this.step + this.start
        var start = index !== undefined && index * this.step + this.start
        return Range.set(start, end)
      },
      toArray: function toArray () {
        return ListIterable.map.call(this, function (item) {return item})
      },
      map: function map (list, callback, thisObj) {
        var map = ListIterable.map.call(this, function (key) {return callback.call(thisObj || {}, list[key], key, list)})
        return Range.newSameTypeOfList(map, list)
      },
      includes: function includes (value) {
        var _this = global.private(this)
        if (!_this.includes) {
          var instance = this
          if (instance.step > 0) {
            _this.includes = function includes (value) {return value >= instance.start && value < instance.end && (value - instance.start) % instance.step === 0}
          } else {
            _this.includes = function includes (value) {return value <= instance.start && value > instance.end && (instance.start - value) % instance.step === 0}
          }
        }
        return _this.includes(value)
      },
      indexOf: function indexOf (value) {
        if (this.includes(value)) {
          return (value - this.start) / this.step
        }
        return - 1
      },
      filter: function filter (list) {
        var thisRange =  this
        var callback = function (item) {return thisRange.includes(item)}
        return list.filter(callback)
      }
    }
  })
  var Range = Record.create('Range', {
    start: 0,
    end: 0,
    step: 1,
    length: 0
  },
    [RangeMethods]
  )
  var Option = Enum.create('Option', [
      ['None'],
      ['Some', GenericRef.type]
    ],
    {
      get value() {
        return this.force('Some')
      },
      isNone: function isNone () {
        return this.isKindOf('None')
      },
      set: function setFn (value) {
        if (value === undefined) {
          return this.None()
        }
        return this.Some(value)
      }
    }
  )
  var LazyParseStringMethods = Proto.interface('LazyParseStringMethods', function (global) {
    return {
      toString () {
        var _this = global.private(this)
        if (_this.boxEnum) {
          return _this.boxEnum.toString()
        }
        return SumDT.toString.call(this.enum)
      },
      get value () {
        var _this = global.private(this)
        if (!_this.boxEnum) {
          var str = this.enum.force('String')
          _this.boxEnum = this.enum.parse('Box(' + str + ')')
        }
        return _this.boxEnum.force('Box')
      }
    }
  })

  var LazyParseBoxMethods = Proto.interface('LazyParseBoxMethods', function (global) {
    return {
      toString () {
        var _this = global.private(this)
        _this.strEnum = _this.strEnum || this.enum.String(this.enum.force('Box').toString())
        return SumDT.toString.call(_this.strEnum)
      },
      get value () {
        return this.enum.force('Box')
      }
    }
  })

  var LazyParse = Enum.create('LazyParse', [
    ['String', String, [LazyParseStringMethods]],
    ['Box', GenericRef.type, [LazyParseBoxMethods]]
  ],
  {
    GenericType: ADT
  })

  var ResultErrorInterface = Proto.interface('ResultErrorInterface', function () {
    return {
      get result() {
        return this.force('Ok')
      },
      get error() {
        return this.get(Error, {
          Ok: function () {throw new RangeError('Result is Ok, is not a Error type.')},
          default: function (error) {return error}
        })
      }
    }
  })

  var Result = Enum.create('Result', [
      ['Ok', GenericRef.type],
      ['Error', Error],
      ['TypeError', TypeError],
      ['RangeError', RangeError],
      ['ReferenceError', ReferenceError],
      ['SyntaxError', SyntaxError]
    ],
   [ResultErrorInterface]
  )

  return {
    Tuple,
    Record,
    Enum,
    Dict,
    List,
    Range,
    Option,
    Result,
    ADT,
    ProductDT,
    TupleMethods,
    RecordMethods,
    MutableMethods,
    SumDT,
    LazyParse,
    ResultErrorInterface,
    ListIterable
  }
})