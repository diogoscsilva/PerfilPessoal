
"use strict"
var createProto = function createProto () {
  var Proto = {}
  var Prime = Object.freeze({})
  var classData = {}
  var modulesData = {}
  var Any = function () {}

  var modulesNames = []
  var moduleName = ''

  var def = Util.def
  def(Proto, 'Any', Any)
  def(Proto, 'executeModule', function executeModule (callback) {
    return callback(modulesData)
  })
  def(Proto, 'module', function module (name, callback) {
    if (Util.hasOwn(modulesData, name)) {
      throw new SyntaxError('Module ' + name + ' already exists.')
    }
    if (!/\w[\w\d]+/.test(name)) {
      throw new SyntaxError('Module ' + name + ' is not valid.')
    }
    var module
    Object.defineProperty(modulesData, name, {get: function () {
      if (!module) {
        if (modulesNames.includes(name)) {
          throw new SyntaxError('Module circular reference.')
        }
        if (moduleName !== '') {
          modulesNames.push(moduleName)
        }
        moduleName = name
        module = Proto.executeModule(callback)
        moduleName = modulesNames.pop() || ''
      }
      return module
    }})
  })
  var create = (function create () {
    var globalShare
    var ownerName = ''
    return function create (callback, reuse) {
      if (!globalShare) {
        globalShare = Proto.GlobalShare.new(classData)
      }
      var global = {
        seal: {},
        class: {},
        extends: function (extensions) {
          global.class.extends = extensions
        },
        implements: function (implementations) {
          global.class.implements = implementations
        },
        static: function () {}
      }
      if (ownerName === '') {
        ownerName = reuse.name + '.'
      }
      var Type = callback(global) || {}
      delete global.extends
      delete global.implements
      global.class.interface = reuse.interface
      global.class.abstract = reuse.abstract
      global.class.selead = reuse.sealed
      global.class.openInstance = reuse.openInstance
      global.class.name = reuse.name
      var className = reuse.name //global.class.name
      if (className === undefined || !/\w[\w\d]+/.test(className)) {
        throw new SyntaxError('Class ' + className + ' is not valid.')
      }
      if (moduleName === '') {
        throw new SyntaxError('The class ' + className + ' must be declared into a module runtime creation.')
      }
      if (ownerName === className + '.') {
        ownerName = ''
      }
      if (Util.hasOwn(classData, moduleName + '.' + ownerName + className)) {
        throw new RangeError(moduleName + '.' + ownerName + className + ' is already defined')
      }
      def(classData, moduleName + '.' + ownerName + className, {})
      var prefix = moduleName + '.' + ownerName
      Type = globalShare.setupType(global, Type, prefix)
      Object.freeze(global.seal)
      Object.preventExtensions(Type)
      return Type
    }
  })()
  def(Proto, 'class', function (name, callback) {
    return create(callback, {
      name,
      interface: false,
      abstract: false,
      sealed: false,
      openInstance: false,
    })
  })
  def(Proto, 'interface', function (name, callback) {
    return create(callback, {
      name,
      interface: true,
      abstract: false,
      sealed: false,
      openInstance: false,
    })
  })
  def(Proto, 'abstract', function (name, callback) {
    return create(callback, {
      name,
      interface: false,
      abstract: true,
      sealed: false,
      openInstance: false,
    })
  })
  def(Proto, 'sealed', function (name, callback) {
    return create(callback, {
      name,
      interface: false,
      abstract: false,
      sealed: true,
      openInstance: false,
    })
  })
  def(Proto, 'lib', function (name, callback) {
    return create(callback, {
      name,
      interface: false,
      abstract: true,
      sealed: true,
      openInstance: false,
    })
  })
  def(Proto, 'open', function (name, callback) {
    return create(callback, {
      name,
      interface: false,
      abstract: false,
      sealed: false,
      openInstance: true,
    })
  })
  def(Proto, 'getName', function (Type) {
    if (typeof Type === 'function') {
      return Type.name
    }
    return Type && Type.class && Type.class.name
  })
  def(Proto, 'getType', function (obj) {
    if (Proto.isCreatedByProto(obj)) {
      return Proto.getClassOf(obj)
    }
    return obj && obj.constructor || Object
  })
  def(Proto, 'isCreatedByProto', function (obj) {
    return Object.prototype.isPrototypeOf.call(Prime, obj)
  })
  def(Proto, 'extendsSomeClass', function (Type) {
    if (!Util.hasOwn(Type, '_this')) {
      return Object.getPrototypeOf(Type) !== Prime
    }
    return false
  })
  def(Proto, 'isExtendedInstance', function (instance) {
    var Class = Object.getPrototypeOf(instance)
    if (Util.hasOwn(Class, '_this')
      && classData[Class.class.name].seal.Type === Class) {
      return true
    }
    return false
  })
  def(Proto, 'getClassOf', function (instance) {
    if (!instance) {
      return Prime
    }
    var LastOwner = Object.getPrototypeOf(instance)
    if (LastOwner === null) {
      return instance
    }
    while (Util.hasOwn(LastOwner, '_this')) {
      LastOwner = Object.getPrototypeOf(LastOwner)
    }
    return LastOwner
  })
  def(Proto, 'getPropertyOwner', function (Type, propName) {
    if (Proto.isCreatedByProto(Type)) {
      return getPropertyOwner(Type, propName)
    }
    return Prime
  })
  function getPropertyOwner (Type, propName) {
    if (Object.prototype.hasOwnProperty.call(Type, propName)) {
      return Type
    }
    var proto = Object.getPrototypeOf(Type)
    return proto === Prime && Type || getPropertyOwner(proto, propName)
  }
  def(Proto, 'instanceof', Util.instanceof)
  def(Proto, 'prototypeof', Util.prototypeof)
  def(Proto, 'typeof', function (Class, Interface) {
    if (Interface === Any) {
      return true
    }
    if (Proto.isCreatedByProto(Interface)) {
      return Util.prototypeof(Class, Interface) || Proto.interfaceof(Class, Interface)
    } else if (typeof Interface !== 'function' || Interface.prototype === undefined) {
      return false
    }
    return Util.instanceof(Class, Interface)
  })
  def(Proto, 'interfaceof', function (Class, Interface) {
    if (!Class) {
      return false
    }
    if (Class === Interface) {
      return true
    }
    Class = (!Proto.isCreatedByProto(Class) || !Util.hasOwn(Class, '_this'))
    && Class || Proto.getClassOf(Class)
    return Class.class && classData[Class.class.name]
    && classData[Class.class.name].implements
    && classData[Class.class.name].implements[Interface.class.name] === true
  })
  def(Proto, 'createClass', function createClass (Type) {
    function F () {
      this.new.apply(this, arguments)
    }
    F.prototype = Object.create(Type)
    F.prototype.constructor = F
    F.prototype.name = /\w[\w\d]+$/.exec(Type.class.name)[0]
    return F
  })

  def(Proto, 'GlobalShare', function () {
    function newGlobalShare (classData) {
      var setInterface = Proto.InterfaceSetter.new(classData)
      var make_this = Proto.MakePrivateThis.new(classData)
      function setupType(global, Type, prefix) {
        var className = prefix + global.class.name
        var reuse = {
          Type: Type,
          global: global,
          classData: classData,
          name: className,
          ownerName: prefix.slice(0, -1),
          preventExtensions: !global.class.open,
          sealed: global.class.sealed,
          abstract: global.class.abstract,
          interface: global.class.interface,
          extends: global.class.extends,
          implements: global.class.implements
        }
        delete global.class
        classData[className].seal = global.seal
        classData[className].interface = reuse.interface
        var interfaces = {
          implements: [],
          extends: []
        }
        typeExtends(reuse, interfaces)
        Type = reuse.Type
        Util.def(Type, 'class', Object.freeze(
          {name: className,
          interface: reuse.interface,
          abstract: reuse.abstract
        }))
        var seal = {
          Type: Type,
          className: className,
          ownerName: reuse.ownerName
        }
        var share = {}
        var newFn = createMethodNew(reuse, seal, make_this, function (getterSuper) {share.getterSuper = getterSuper})
        if (reuse.sealed) {
          Util.def(Type, 'new', function newSeleadFn () {
            var args = arguments
            if (this !== Type) {
              args = Array.prototype.slice.call(arguments)
              reuse.global.seal.private(args.pop())
            }
            return newFn.apply(this, args)
          })
        } else {
          Util.def(Type, 'new', newFn)
        }
        typeImplements(reuse, interfaces)
        setInterface(reuse, interfaces)
        global.seal.Type = Type
        global.seal.className = className
        global.seal.private = setGlobalPrivate(reuse, classData)
        global.seal.protected = global.seal.protected || setGlobalProtected(reuse)
        global.seal.interface = setGlobalInterface(global, classData)
        Util.def(global, 'private', function (instance) {
          return make_this.get_this(instance, global.seal.Type)
        })
        Util.def(global, 'interface', function (instance) {
          var className = Proto.getClassOf(instance).class.name
          return getDictInterfaces(classData, className)
        })
        Util.def(global, 'of', function ofFn (instance) {
          return Type === Object.getPrototypeOf(instance)
        })
        Object.defineProperty(global, 'super', {
          get: function getterSuperFn() {
            return share.getterSuper
          }
        })
        if (reuse.interface) {
          Util.def(global, 'typeof', function typeofFn (instance, Type, checker) {
            if (!Util.checkPattern(instance, Type, checker)) {
              throw new TypeError('Not fulfill expected type struture for ' + Proto.getName(global.seal.Type) + ' interface')
            }
          })
          Util.def(global, 'constructor', function (instance) {
            make_this.get_this(instance, global.seal.Type)
          })
        }
        global.static(Type)
        delete global.static
        freezeType(reuse)
        return Type
      }
      return {
        setupType: setupType
      }
    }
    function setGlobalProtected (reuse) {
      var global = reuse.global
      if (reuse.interface) {
        return function setGlobalProtectedError () {
          throw new TypeError(global.seal.className + ' is not a class Type.')
        }
      } else {
        return function setGlobalProtected (sealObj) {
          if (typeof sealObj === 'function') {
            if (sealObj !== global.seal.protected) {
              throw new SyntaxError('Function of ' + Proto.getName(global.seal.Type) + ' sealed for protected internal use.')
            }
          } else if (Proto.prototypeof(sealObj, Object.getPrototypeof(global.seal.Type))) {
            return setGlobalProtected
          }
        }
      }
    }
    function setGlobalInterface (global, classData) {
      function  setGlobalInterface (sealObj) {
        if (!Proto.interfaceof(sealObj.Type, global.seal.Type)
        || classData[sealObj.className].seal.interface !== sealObj) {
          throw new SyntaxError('Function of ' + Proto.getName(global.seal.Type) + ' sealed for interface internal use.')
        }
      }
      Util.def(setGlobalInterface, 'Type', global.seal.Type)
      return setGlobalInterface
    }
    function setGlobalPrivate (reuse, classData) {
      var global = reuse.global
      return function setGlobalPrivate (sealObj) {
        if (typeof sealObj === 'function') {
          if (sealObj !== global.seal.private
          && (!Util.hasOwn(classData, reuse.ownerName)
          || classData[reuse.ownerName].seal.private !== sealObj)) {
            throw new SyntaxError('Function of ' + Proto.getName(global.seal.Type) + ' sealed for private internal use.')
          }
        } else if (Proto.getClassOf(sealObj) === global.seal.Type) {
          return setGlobalPrivate
        }
      }
    }
    function typeExtends (reuse, interfaces) {
      var Super = reuse.extends
      var NewType
      if (!Super) {
        NewType = Object.create(Prime)
      } else if (reuse.interface) {
        interfaces.extends = Super.slice()
        Object.freeze(reuse.extends)
        NewType = Object.create(Prime)
      } else {
        var classData = reuse.classData
        if (!Util.hasOwn(Super, 'class') || classData[Super.class.name] === undefined) {
          throw new TypeError('Invalide super type for ' + reuse.name + ' Type.')
        } else if (Super.class.interface) {
          throw new TypeError('Invalide interface as super type for ' + reuse.name + ' Type.')
        } else if (!Super.class.abstract) {
          throw new TypeError('Invalide no abstract super type for ' + reuse.name + ' Type.')
        }
        var className = reuse.name
        classData[className].implements = classData[Super.class.name].implements
        classData[className].seal.protected = classData[Super.class.name].seal.protected
        NewType = Object.create(Super)
      }
      reuse.Type = Util.copyAllDiscriptors(reuse.Type, NewType)
    }
    function typeImplements (reuse, interfaces) {
      if (!reuse.implements) {
        return
      }
      interfaces.implements = reuse.implements
      Object.freeze(reuse.implements)
    }

    function getDictInterfaces (classData, className) {
      if (!Util.hasOwn(classData[className], 'dictInterfaces')) {
        var interfacesList = classData[className].interfaces
        var dict = {}
        for (var i = 0; i < interfacesList.length; i++) {
          var Interface = interfacesList[i]
          dict[Interface.class.name] = Interface
          var resumedName = Interface.class.name.replace(/([^.]+\.)*([^.]+$)/, ('$2'))
          if (!Util.hasOwn(dict, resumedName)) {
            dict[resumedName] = Interface
          }
        }
        classData[className].dictInterfaces = Object.freeze(dict)
      }
      return classData[className].dictInterfaces
    }
    function pseudo () {}
    function freezeType (reuse) {
      var Type = reuse.Type
      if (Proto.extendsSomeClass(Type)) {
        var Super = reuse.extends
        for (var propName in Super) {
          if (Util.hasOwn(Super, propName) && !Util.hasOwn(Type, propName)) {
            var descriptor = Object.getOwnPropertyDescriptor(Super, propName)
            if (descriptor.hasOwnProperty('value') && Super[propName] === undefined) {
              Object.defineProperty(Type, propName, {enumerable: true, value: undefined})
            }
          }
        }
      }
      var abstractError = new SyntaxError(reuse.name + ' must implement abstract property ' + propName + '.')
      for (var propName in Type) {
        if (Util.hasOwn(Type, propName)) {
          var descriptor = Object.getOwnPropertyDescriptor(Type, propName)
          var newDescriptor = {
            enumerable: !reuse.interface && descriptor.configurable ? false : descriptor.enumerable,
            configurable: false
          }
          if (descriptor.hasOwnProperty('value')) {
            newDescriptor.writable = false
            if (descriptor.value === undefined) {
              if (reuse.interface || reuse.abstract) {
                newDescriptor.enumerable = true
              } else {
                throw abstractError
              }
            } else if (descriptor.value === Util.pseudo && (reuse.interface || reuse.abstract)) {
              delete newDescriptor.writable
              newDescriptor.enumerable = true
              newDescriptor.get = pseudo
            }
          } else if (descriptor.get === pseudo && !reuse.interface && !reuse.abstract) {
            throw abstractError
          }
          Object.defineProperty(Type, propName, newDescriptor)
        }
      }
    }
    function createMethodNew (reuse, seal, make_this, setSuperFn) {
      var Type = reuse.Type
      var share = reuse.extends && !reuse.interface ? superShareManager(seal, make_this, setSuperFn) : shareManager(seal, make_this, setSuperFn)
      var newFn = createMethodNew.getNewFn(reuse)
      var newInstance = function () {
        share(this)
        return newFn.apply(this, arguments) || this
      }
      return function () {
        if (this === Type) {
          var instanceThis = Object.create(Type)
          var instance = newInstance.apply(instanceThis, arguments)
          if (reuse.abstract) {
            throw new SyntaxError('It is impossible to create an instance from the ' + reuse.name + ' abstract class.')
          }
          Util.def(instanceThis, '_this', instanceThis._this)
          if (reuse.preventExtensions) {
            Object.preventExtensions(instanceThis)
          }
          return instance
        }
        return newInstance.apply(this, arguments)
      }
    }
    createMethodNew.getNewFn = function (reuse) {
      var Type = reuse.Type
      var newFn = Type.new
      if (!Object.prototype.hasOwnProperty.call(Type, 'new')) {
        if (reuse.interface || !reuse.extends) {
          newFn = function () { }
        } else {
          newFn = function () {
            reuse.global.super.apply(this, arguments)
          }
        }
      }
      return newFn
    }
    function superShareManager (seal, make_this, setSuperFn) {
      var Super = Object.getPrototypeOf(seal.Type)
      setSuperFn(Super)
      return function share_this(instance) {
        setSuperFn(function superNewFn() {
          Super.new.apply(instance, arguments)
          make_this.super(seal, instance)
          setSuperFn(Super)
        })
      }
    }
    function shareManager (seal, make_this, setSuperFn) {
      setSuperFn(function defaultSuperFn() {
        var Type = seal.Type
        throw new SyntaxError(Type.class.name + ' does not extend any class.')
      })
      return function share_this(instance) {
        make_this(seal, instance)
      }
    }
    var GlobalShare = {
      new: newGlobalShare
    }
    return Object.freeze(GlobalShare)
  }())
  def(Proto, 'Implementation', function (Class, implementations, objects) {
    var Implementation = {}
    function getDescriptor (Type, propName) {
      return Object.getOwnPropertyDescriptor(Proto.getPropertyOwner(Type, propName), propName)
    }
    function isDefaultProperty (propName, Interface, instanceInterfaceProps) {
      return !(propName in Class)
        || (propName in Object && Object[propName] === Class[propName])
        || !Object.prototype.hasOwnProperty.call(Class, propName)
        && Class[propName] === instanceInterfaceProps[propName]
        && Interface[propName] !== undefined
    }
    function isDefaultPseudo (propName, classDescriptor, instanceInterfaceProps) {
      return !classDescriptor
        || !Object.prototype.hasOwnProperty.call(Class, propName)
        && instanceInterfaceProps[propName]
        && classDescriptor.get === instanceInterfaceProps[propName].get
        && classDescriptor.set === instanceInterfaceProps[propName].set
    }
    function implementsClass (Interface, instanceInterfaceProps) {
      for (var propName in Interface) {
        if (Util.hasOwn(Interface, propName)) {
          var interfaceDescriptor = Object.getOwnPropertyDescriptor(Interface, propName)
          var classDescriptor = getDescriptor(Class, propName)
          if (interfaceDescriptor.hasOwnProperty('value')) {
            if (interfaceDescriptor.value === undefined
            && classDescriptor && (!classDescriptor.hasOwnProperty('value'))) {
              throw new TypeError('Method type erro')
            }
            if (isDefaultProperty(propName, Interface, instanceInterfaceProps)) {
              Util.def(Class, propName, Interface[propName])
              Object.defineProperty(instanceInterfaceProps, propName, { enumerable: Interface[propName] === undefined, value: Interface[propName] })
            }
          } else {
            if (isDefaultPseudo(propName, classDescriptor, instanceInterfaceProps)) {
              Util.def(instanceInterfaceProps, propName, interfaceDescriptor)
              Object.defineProperty(Class, propName, { get: interfaceDescriptor.get, set: interfaceDescriptor.set })
            }
          }
        }
      }
    }
    Implementation.implementsInterfaces = function (interfaces, instanceInterfaceProps) {
      var className = Class.class.name
      instanceInterfaceProps = instanceInterfaceProps || {}
      for (var i = 0; i < interfaces.length; i++) {
        implementsClass(interfaces[i], instanceInterfaceProps)
        Util.addIn(implementations[className], interfaces[i])
        objects[interfaces[i].class.name] = true
      }
      for (var i = 0; i < interfaces.length; i++) {
        var interfaceSet = implementations[interfaces[i].class.name] || []
        interfaceSet.forEach(function (Interface) {
          implementsClass(Interface, instanceInterfaceProps)
          objects[Interface.class.name] = true
          Util.addIn(implementations[className], Interface)
        })
      }
      return implementations[className]
    }
    Implementation.implementsSuperInterfaces = function () {
      var className = Class.class.name
      if (Proto.extendsSomeClass(Class)) {
        var interfaceSet = implementations[Object.getPrototypeOf(Class).class.name] || []
        interfaceSet.forEach(function (Interface) {
          objects[Interface.class.name] = true
          Util.addIn(implementations[className], Interface)
        })
      }
    }
    Implementation.createInterfaceProps = function (reuse, classInterfaceProps) {
      var className = reuse.name
      var Super = reuse.extends
      var interfaceProps = Super && !reuse.interface && Object.create(classInterfaceProps[Super.class.name]) || {}
      classInterfaceProps[className] = interfaceProps
      return interfaceProps
    }
    Implementation.checkClassImplementations = function (reuse, interfaceProps) {
      if (!reuse.abstract) {
        for (var propName in interfaceProps) {
          if (Util.hasOwn(interfaceProps, propName) && interfaceProps[propName] === undefined) {
            throw new SyntaxError(reuse.name + ' must implement interface property ' + propName + '.')
          }
        }
      }
    }
    return Implementation
  })
  def(Proto, 'InterfaceSetter', function () {
    var InterfaceSetter = {}
    InterfaceSetter.new = function () {
      var implementations = {}
      var classInterfaceProps = {}

      return function (reuse, interfaces) {
        var Type = reuse.Type
        var className = reuse.name
        var objects = {}
        implementations[className] = []
        var implementation = Proto.Implementation(Type, implementations, objects)
        var interfaceProps = implementation.createInterfaceProps(reuse, classInterfaceProps)
        if (reuse.interface) {
          implementation.implementsInterfaces(interfaces.extends)
        } else {
          implementation.implementsInterfaces(interfaces.implements, interfaceProps)
          implementation.implementsInterfaces(interfaces.extends)
          implementation.implementsSuperInterfaces()
          implementation.checkClassImplementations(reuse, interfaceProps)
        }
        delete interfaces.implements
        delete interfaces.extends
        reuse.classData[className].interfaces = implementations[className]
        reuse.classData[className].implements = objects
      }
    }
    return Object.freeze(InterfaceSetter)
  }())
  def(Proto, 'MakePrivateThis', function () {
    var MakePrivateThis = {}
    MakePrivateThis.new = function (classData) {
      var _thisHolder
      function share (seal, instance) {
        if (!Object.prototype.isPrototypeOf.call(seal.Type, instance)) {
          throw new TypeError('Type error')
        }
        var ownerSeal = classData[seal.ownerName] && classData[seal.ownerName].seal
        var interfaces = {}
        var shared = {}
        if (Proto.getClassOf(instance) === seal.Type) {
          var interfacesList = classData[seal.className].interfaces
          interfaces = implementList(interfacesList || [])
        }
        function _this (Type) {
          if (Type === seal.Type || ownerSeal && Type === ownerSeal.Type) {
            if (instance !== this) {
              throw new TypeError('Private this of Type ' + Proto.getName(seal.Type) + ' is not of original instance.')
            }
            _thisHolder(shared)
          } else {
            var className = Type.class.name
            if (Util.hasOwn(interfaces, className)) {
              var holder = _thisHolder
              if(!Util.hasOwn(interfaces[className], '_this')) {
                interfaces[className] = interfaces[className].new(this)
                _thisHolder = holder
              }
              interfaces[className]._this(Type)
            } else if (Util.hasOwn(shared, 'super')) {
              shared.super._this.call(this, Type)
            }
          }
        }
        Object.defineProperty(instance, '_this', {configurable: true, value: _this,})
        return shared
      }
      function extendThis (instance) {
        var base = {}
        if (Util.hasOwn(instance, '_this')) {
          Object.defineProperty(base, '_this', {value: instance._this })
        }
        return Object.preventExtensions(base)
      }
      function implementList (interfacesList) {
        var dict = {}
        for (var i = 0; i < interfacesList.length; i++) {
          var Interface = interfacesList[i]
          dict[Interface.class.name] = Interface
        }
        return dict
      }
      function make_this (seal, instance) {
        share(seal, instance)
      }
      make_this.super = function (seal, instance) {
        var sharedSuper = extendThis(instance)
        var shared = share(seal, instance)
        Util.def(shared, 'super', sharedSuper)
      }
      make_this.get_this = function (instance, Type) {
        if (!Util.hasOwn(instance, '_this')) {
          if (Proto.prototypeof(instance, Type) && Proto.extendsSomeClass(Type)) {
            throw new SyntaxError(Proto.getName(Type) + ' must call super ' + Proto.getName(Object.getPrototypeOf(Type)) + ' before get the private this.')
          } else {
            throw new TypeError('The instance must be a type of ' + Proto.getName(Type) + ' to get the private this.')
          }
        }
        var _this
        _thisHolder = function (shared) {_this = shared}
        instance._this(Type)
        _thisHolder = undefined
        return _this
      }
      return make_this
    }
    return Object.freeze(MakePrivateThis)
  }())
  return Proto
}
Object.defineProperty(this, 'Proto', {value: createProto()})