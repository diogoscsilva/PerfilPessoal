"use strict"
Proto.module('ReactUse', function (imports) {
  var Generic = imports.Generic.Generic
  var GenericRef = imports.Ref.GenericRef
  var Box = imports.Box.Box
  var DataClass = imports.DataProxy.DataClass
  var ObjectMethods = imports.ObjectIterator.ObjectMethods
    
  var ServerInterface = Proto.interface('ServerInterface', function (global) {
    return {
      fetch: undefined,
      scan: undefined,
      previous:undefined,
      update:undefined,
      stopUpdate: undefined,
      refresh: undefined,
      stopRefresh: undefined,
      getLogoutTask: undefined
    }
  })

  var DomComponent = Proto.interface('DomComponent', function (global) {
    return {
      exec: undefined
    }
  })

  var Component = Proto.lib('Component', function (global) {
    global.implements([DomComponent])
    var seal = global.seal
    function setDomUse (instance, props, parentEl, useId) {
      var _this = global.private(instance)
      _this.domUse.setRenderedComponent(instance, useId)
      return _this.domUse
    }
    return {
      create: function create (name, objType) {
        return Proto.class(name, function (global) {
          global.extends(Component)
          objType.new = function newFn (parentUse) {
            global.super(parentUse, global.of(this) && seal.private)
          }
          return objType
        })
      },
      render: undefined,
      new: function newFn (domUse) {
        var _this = global.private(this)
        _this.domUse = domUse
        Util.def(this, 'use', domUse.getComponentUse())
        Util.def(this, 'tagName', this.class.name)
      },
      exec: function exec (props, parentEl, edgeEl, useId) {
        var domUse = setDomUse(this, props, parentEl, useId)
        var startEdgeEl, endEdgeEl
        if (edgeEl) {
          startEdgeEl = edgeEl.previousSibling
          var componentDom = this.render(props)
          componentDom.render(props, parentEl, edgeEl, DomUse.newUseId(useId))
          startEdgeEl = startEdgeEl && startEdgeEl.nextSibling || parentEl.children[0]
          endEdgeEl = edgeEl.previousSibling
        } else {
          var start = parentEl.children.length
          var componentDom = this.render(props)
          componentDom.render(props, parentEl, edgeEl, DomUse.newUseId(useId))
          startEdgeEl = parentEl.children[start]
          endEdgeEl = parentEl.children[parentEl.children.length - 1]
        }
        domUse.setElement(parentEl, props)
        domUse.setEdges(startEdgeEl, endEdgeEl)
      },
      hydrateExec: function hydrateExec (props, parentEl, edge, useId) {
        var domUse = setDomUse(this, props, parentEl, useId)
        if (/^\s*hydrate-defer(\s+|$)/.test(edge.el.className)) {
          edge.el.addEventListener('hydrateNow', domUse.hydrateNow())
        }
        var startEdgeEl = edge.el
        var componentDom = this.render(props)
        componentDom.hydrate(props, parentEl, edge, DomUse.newUseId(useId))
        domUse.setElement(parentEl, props)
        domUse.setEdges(startEdgeEl, edge.el && edge.el.previousSibling || parentEl.children[parentEl.children.length - 1])
      }
    }
  })
  var ConstComponent = Proto.abstract('ConstComponent', function (global) {
    global.implements([DomComponent])
    return {
      getStartEdge: function getStarElement (parentEl, edgeEl) {
        var startEdge
        if (edgeEl) {
          startEdge = edgeEl.previousSibling
        } else {
          startEdge = parentEl.children.length
        }
        return startEdge
      },
      insertConstElements: function insertConstElements (elements, parentEl, edgeEl) {
        for (var i = 0; i < elements.length; i++) {
          parentEl.insertBefore(elements[i], edgeEl || null)
        }
      },
      new: function newFn (component, domUse) {
        if (!Proto.prototypeof(component, Component)) {
          throw new TypeError('Const component must wrap a Component type.')
        }
        Util.def(this, 'use', component.use)
        Util.def(this, 'tagName', component.tagName)
        var _this = global.private(this)
        _this.domUse  = domUse
        _this.component = component
      },
      setEdges: function setEdges (startEdge, parentEl, edgeEl) {
        var _this = global.private(this)
        _this.domUse.setElement(parentEl, {})
        if (edgeEl) {
          _this.domUse.setEdges(startEdge && startEdge.nextSibling || parentEl.children[0], edgeEl.previousSibling)
        } else {
          _this.domUse.setEdges(parentEl.children[startEdge], parentEl.children[parentEl.children.length - 1])
        }
      },
      getConstElements: function getConstElements () {
        var _this = global.private(this)
        return _this.domUse.getConst()
      },
      setConstElements: function setConstElements () {
        var _this = global.private(this)
        _this.domUse.setConst()
      },
      execConst: function execConst (props, parentEl, edgeEl, useId) {
        var constElements = this.getConstElements()
        if (constElements.length > 0) {
          var startEdge = ConstComponent.getStartEdge(parentEl, edgeEl)
          this.execPrecedent(props, parentEl, edgeEl, useId)
          ConstComponent.insertConstElements(constElements, parentEl, edgeEl)
          this.execFurther(props, parentEl, edgeEl, useId)
          this.setEdges(startEdge, parentEl, edgeEl)
          this.setConstElements()
        } else {
          this.execComponent(props, parentEl, edgeEl, useId)
          this.setConstElements()
        }
      },
      execComponent: function execComponent (props, parentEl, edgeEl, useId) {
        var _this = global.private(this)
        Object.getPrototypeOf(Proto.getClassOf(_this.component)).exec.call(_this.component, props, parentEl, edgeEl, useId)
      },
      execFurther: function () {
      },
      execPrecedent: function () {
      },
      hydrateExec: function hydrateExec (props, parentEl, edgeEl, useId) {
        this.exec(props, parentEl, edgeEl, useId)
      },
      exec: function exec (props, parentEl, edgeEl, useId) {
        var _this = global.private(this)
        _this.domUse.setRenderedComponent(_this.component, useId)
        this.execConst(props, parentEl, edgeEl, useId)
      }
    }
  })
  var ConstRender = Proto.class('ConstRender', function (global) {
    global.extends(ConstComponent)
  })
  var ConstPrecedent = Proto.class('ConstPrecedent', function (global) {
    global.extends(ConstComponent)
    return {
      execPrecedent: ConstComponent.execComponent
    }
  })
  var ConstFurther = Proto.class('ConstFurther', function (global) {
    global.extends(ConstComponent)
    return {
      execFurther: ConstComponent.execComponent
    }
  })
  var ConstSet = Proto.class('ConstSet', function (global) {
    global.extends(ConstComponent)
    return {
      execPrecedent: ConstComponent.execComponent
    }
  })
  var ConstSubstitute = Proto.class('ConstSubstitute', function (global) {
    global.extends(ConstComponent)
    return {
      execConst (props, parentEl, edgeEl, useId) {
        this.getConstElements()
        this.execComponent(props, parentEl, edgeEl, useId)
        this.setConstElements()
      }
    }
  })
  var ConstUnchange = Proto.class('ConstUnchange', function (global) {
    global.extends(ConstComponent)
    return {
      execConst (props, parentEl, edgeEl) {
        var constElements = this.getConstElements()
        if (constElements.length > 0) {
          var startEdge = ConstComponent.getStartEdge(parentEl, edgeEl)
          ConstComponent.insertConstElements(constElements, parentEl, edgeEl)
          this.setEdges(startEdge, parentEl, edgeEl)
        }
        this.getConstElements()
      }
    }
  })
  var ConstChange = Proto.class('ConstChange', function (global) {
    global.extends(ConstComponent)
    return {
      new: function newFn (component, domUse) {
        global.super(component, domUse)
      },
      execConst (props, parentEl, edgeEl, useId) {
        var constElements = this.getConstElements()
        var range = props.getRange(constElements.slice())
        var startEdge = ConstComponent.getStartEdge(parentEl, edgeEl)
        ConstComponent.insertConstElements(constElements.slice(0, range.start), parentEl, edgeEl)
        this.execComponent(props, parentEl, edgeEl, useId)
        ConstComponent.insertConstElements(constElements.slice(range.end), parentEl, edgeEl)
        this.setEdges(startEdge, parentEl, edgeEl)
        this.setConstElements()
      }
    }
  })
  var Native = Proto.abstract('Native', function (global) {
    global.implements([DomComponent])
    var ListenerManager = Proto.class('ListenerManager', function (global) {
      return {
        new: function newFn (el) {
          var _this = global.private(this)
          _this.el = el
          _this.listeners = []
          el.addEventListener('clearListeners', this.clearListeners)
        },
        dispatchClearEvent () {
          var _this = global.private(this)
          _this.el.dispatchEvent(new Event('clearListeners'))
        },
        get addListener () {
          var _this = global.private(this)
          return function addListener (el, eventType, callback) {
            el.addEventListener(eventType, callback)
            _this.listeners.push([eventType, callback])
          }
        },
        get clearListeners () {
          var _this = global.private(this)
          var listeners = _this.listeners
          return function clearListeners (e) {
            for (var i = 0; i < listeners.length; i++) {
            _this.el.removeEventListener(listeners[i][0], listeners[i][1])
            }
            _this.el.removeEventListener('clearListeners', clearListeners)
          }
        }
      }
    })
    return {
      continue: function continueFn () {},
      newHydrateAddListener: function newHydrateAddListener (el) {
        var listenerManager = ListenerManager.new(el)
        listenerManager.dispatchClearEvent()
        return listenerManager.addListener
      },
      newAddListener: function newAddListener (el) {
        var listenerManager = ListenerManager.new(el)
        return listenerManager.addListener
      },
      exec: function (props, parentEl, edgeEl, useId) {
        return this.exec(props, parentEl, edgeEl, useId)
      },
      hydrateExec: function (props, parentEl, edgeEl, useId) {
        return this.hydrateExec(props, parentEl, edgeEl, useId)
      }
    }
  })

  var Tag =  Proto.class('Tag', function (global) {
    global.extends(Native)
    return {
      attributes: Object.freeze({
        type: 1,
        placeholder: 1,
        value: 1,
        id: 1,
        src: 1,
        alt: 1,
        role: 1,
        'aria-label': 1,
        'aria-labelledby': 1,
        action: 1,
      }),
      handlers: Object.freeze({
        onClick: "click",
        onChange: "change",
        onInput: "input",
        onBlur: "blur",
        onLoad: "load",
        onFocus: "focus",
        onFocusin: "focusin",
        onFocusout: "focusout",
        onScroll: "scroll",
        onDismount: "dismount",
        onSubmit: "submit"
      }),
      new: function newFn (tagName, addRenderFn) {
        global.super()
        Util.def(this, 'tagName', tagName)
        Util.def(this, 'addRenderFn', addRenderFn)
      },
      exec: function exec (props, parentEl, edgeEl, useId) {
        var children = props.children
        var el = document.createElement(this.tagName)
        var addListener = Native.newAddListener(el)
        for (var propName in props) {
          if (Util.hasOwn(props, propName)) {
            if (Tag.attributes.hasOwnProperty(propName)) {
              el.setAttribute(propName, props[propName])
            } else if (Tag.handlers.hasOwnProperty(propName)) {
              addListener(el, Tag.handlers[propName], props[propName])
            } else if (propName === 'className') {
              el.className = ((el.className || '') + ' ' + props.className).trim()
            }
          }
        }
        for (var i = 0; i < children.length; i++) {
          children[i].render(props, el, null, DomUse.newUseId(useId, i))
        }
        parentEl.insertBefore(el, edgeEl || null)
        if (Util.hasOwn(props, 'onRender')) {
          //props.onRender({target: el, addListener})
          this.addRenderFn(props.onRender, {target: el, addListener})
        }
      },
      hydrateExec: function hydrateExec (props, parentEl, edge, useId) {
        var children = props.children
        var el = edge.el
        edge.el = el.nextElementSibling
        var addListener = Native.newHydrateAddListener(el)
        if (/^\s*hydrate-defer(\s+|$)/.test(el.className)) {
          function hydrateNow () {
            el.className = el.className.replace(/^\s*hydrate-defer(?:\s+|$)/, '$1')
            el.dispatchEvent(new Event('hydrateNow'))
          }
          for (var propName in props) {
            if (Util.hasOwn(props, propName) && Util.hasOwn(Tag.handlers, propName) && props[propName] === Native.continue) {
              addListener(el, Tag.handlers[propName], hydrateNow)
            }
          }
          return
        }
        for (var propName in props) {
          if (Util.hasOwn(props, propName) && Tag.handlers.hasOwnProperty(propName)) {
            addListener(el, Tag.handlers[propName], props[propName])
          }
        }
        var childEdge = {el: el.children[0]}
        for (var i = 0; i < children.length; i++) {
          if (children[i].getComponentName() !== 'text') {
            children[i].hydrate(props, el, childEdge, DomUse.newUseId(useId, i))
          }
        }
        if (Util.hasOwn(props, 'onRender')) {
          //props.onRender({target: el, addListener})
          this.addRenderFn(props.onRender, {target: el, addListener})
        }
      }
    }
  })

  var Fragment =  Proto.sealed('Fragment', function (global) {
    global.extends(Native)
    function execFrag (props, el, fragEdge, useId, getRenderFn) {
      var children = props.children
      var addListener = Native.newAddListener(el)
      for (var propName in props) {
        if (Util.hasOwn(props, propName) && Util.hasOwn(Tag.handlers, propName)) {
          addListener(el, Tag.handlers[propName], props[propName])
        }
      }
      var renderFn = getRenderFn(props, el, fragEdge)
      for (var i = 0; i < children.length; i++) {
        renderFn(children[i], DomUse.newUseId(useId, i))
      }
      if (Util.hasOwn(props, 'onRender')) {
        //props.onRender({target: el, addListener})
        this.addRenderFn(props.onRender, {target: el, addListener})
      }
    }
    function getRender (props, el, fragEdge) {
      return function renderFn (child, useId) {
        child.render(props, el, fragEdge, useId)
      }
    }
    function getHydrate (props, el, fragEdge) {
      return function hydrateFn (child, useId) {
        child.hydrate(props, el, fragEdge, useId)
      }
    }
    return {
      tagName: 'fragment',
      new: function newFn (addRenderFn) {
        global.super()
        Util.def(this, 'addRenderFn', addRenderFn)
      },
      exec: function exec (props, el, fragEdge, useId) {
        execFrag.call(this, props, el, fragEdge, useId, getRender)
      },
      hydrateExec: function hydrateExec (props, el, fragEdge, useId) {
        el.dispatchEvent(new Event('clearListeners'))
        execFrag.call(this, props, el, fragEdge, useId, getHydrate)
      },
    }
  })

  var Text = Proto.sealed('Text', function (global) {
    global.extends(Native)
    return {
      tagName: 'text',
      exec: function exec (props, parentEl, edgeEl, useId) {
        parentEl.insertBefore(document.createTextNode(props.text), edgeEl || null)
      },
      hydrateExec: Util.noAction
    }
  })

  var ClearState = Component.create('ClearState', {
    render: function render () {
      return this.use.frag()
    }
  })
  
  var Out = Proto.class('Out', function (global) {
    function justOneTimeSet (value) {
      var _this = global.private(this)
      if (_this.setted) {
        throw new RangeError('Out instance alredy have a value')
      }
      _this.setted = true
      return value
    }
    return {
      get solo () {
        return Out.new(justOneTimeSet)
      },
      init: function init (value) {
        return Out.new(Util.pass, value)
      },
      new: function newFn (callback, value) {
        var _this = global.private(this)
        _this.value = value
        _this.setted = false
        _this.callback = callback
      },
      set: function setFn (value) {
        var _this = global.private(this)
        _this.value = _this.callback.call(this, value)
        return this
      },
      get out () {
        var _this = global.private(this)
        return _this.value
      }
    }
  })

  var Context = Proto.class('Context', function (global) {
    return {
      new: function newFn (obj) {
        var _this = global.private(this)
        for (var propName in obj) {
          if (Util.hasOwn(obj, propName)) {
            this.setup(propName, obj[propName])
          }
        }
      },
      setup: function setup (propName, pair) {
        var _this = global.private(this)
        if (Util.prototypeof(pair, Out)) {
          _this[propName] = pair                         
        } else if (Util.instanceof(pair, Array)) {
          if (pair.length === 1) {
            _this[propName] = Out.solo.set(pair[0])
          } else {
            _this[propName] = Out.new(pair[1], pair[0])
          }
        }
      },
      set: function setFn (propName, value) {
        var _this = global.private(this)
        _this[propName].set(value)
      },
      get: function getFn (propName) {
        var _this = global.private(this)
        return _this[propName] && _this[propName].out
      }
    }
  })
  var Model = Proto.class('Model', function (global) {
    var Reduxer = Proto.class('Reduxer', function (global) {
      function makeStateRedux (state, reduxers) {
        return function stateRedux (reduxName, value) {
          state.value = reduxers[reduxName](state.value, value)
          return state.value
        }
      }
      function makeExecRedux (stateRedux, reduxName) {
        return function exec (value) {
          return stateRedux(reduxName, value)
        }
      }
      return {
        new: function newFn (initial, reduxers) {
          var _this = global.private(this)
          _this.initial = initial
          _this.reduxers = reduxers
        },
        make: function make (state) {
          var _this = global.private(this)
          var obj = {}
          state.value = _this.initial
          var stateRedux = makeStateRedux(state, _this.reduxers)
          for (var reduxName in _this.reduxers) {
            if (Util.hasOwn(_this.reduxers, reduxName)) {
              obj[reduxName] = makeExecRedux(stateRedux, reduxName)
            }
          }
          return obj
        }
      }
    })
    var DefaultReduxer = Reduxer.new(undefined, {redux: function (state, value) {return value}})
    var defaultReduxer = DefaultReduxer.make({})
    return {
      default: DefaultReduxer,
      newRedux: function newRedux (state, reduxers) {
        return Reduxer.new(state, reduxers)
      },
      new: function newFn (props, instanceProps) {
        instanceProps = instanceProps || {}
        var _this = global.private(this)
        _this.props = props
        for (var propName in instanceProps) {
          if (Util.hasOwn(instanceProps, propName) && !Util.hasOwn(Model, propName)) {
            Util.def(this, propName, instanceProps[propName])
          }
        }
      },
      get: function getFn (name) {
        var _this = global.private(this)
        return _this.states[name].state.value
      },
      dispatch: function dispatch (reduxName, value) {
        var _this = global.private(this)
        var stateName = _this.reduxers[reduxName].state
        var callbacks = _this.states[stateName].callbacks
        _this.states[stateName].queue = callbacks
        _this.states[stateName].callbacks = []
        var result = _this.reduxers[reduxName].redux(value)
        var resultGetter = function () {return result}
        for (var i = 0; i < callbacks.length; i++) {
          callbacks[i](resultGetter, reduxName.slice(stateName.length + 1))
        }
        _this.states[stateName].queue = []
      },
      subscribe: function subscribe (name, callback) {
        var _this = global.private(this)
        var id = _this.states[name].callbacks.length
        _this.states[name].callbacks.push(callback)
        return function unsubscribe () {
          if(_this.states[name].callbacks[id] === callback) {
            _this.states[name].callbacks.splice(id, 1)
            _this.states[name].queue.splice(id, 1)
          }
        }
      },
      make: function make (instanceProps) {
        var props = global.private(this).props
        var instance = Proto.getClassOf(this).new(props, instanceProps)
        var _this = global.private(instance)
        _this.states = {}
        _this.reduxers = {}
        for (var name in props) {
          var state = {}
          if (Util.hasOwn(props, name) && Proto.prototypeof(props[name], Reduxer)) {
            var defaultReduxer = DefaultReduxer.make(state)
            if (props[name] === DefaultReduxer) {
              _this.reduxers[name] = {
                state: name,
                redux: defaultReduxer.redux
              }
            } else {
              var redux = props[name].make(state)
              for (var reduxName in redux) {
                if (Util.hasOwn(redux, reduxName)) {
                  _this.reduxers[name + '.' + reduxName] = {
                    state: name,
                    redux: redux[reduxName]
                  }
                }
              }
            }
            _this.states[name] = {
              callbacks: [],
              queue: [],
              state
            }
          }
        }
        return instance
      }
    }
  })
  var Dom = Proto.class('Dom', function (global) {
    function setParentDom (instance, parentDom) {
      var _this = global.private(instance)
      _this.parentDom = parentDom
    }
    function setProps (props, parentProps) {
      if (!parentProps) {
        return
      }
      if (!Util.hasOwn(props, 'context') && Proto.prototypeof(parentProps.context, Context)) {
        props.context = parentProps.context
      }
      if (!Util.hasOwn(props, 'server') && Proto.interfaceof(parentProps.server, ServerInterface)) {
        props.server = parentProps.server
      }
      if (!Util.hasOwn(props, 'model') && Proto.prototypeof(parentProps.model, Model)) {
        props.model = parentProps.model
      }
    }
    return {
      new: function newFn (component, props, domUse) {
        if (!Proto.interfaceof(component, DomComponent))  {
          'A component must implement DomComponent interface.'
        }
        var _this = global.private(this)
        if (!Proto.isCreatedByProto(props)) {
          props = ObjectMethods.map.call(props, function (item) {return item})
        }
        _this.componentUse = domUse.getComponentUse()
        _this.component = component
        _this.props = props
        _this.children = props.children || []
        props.children = _this.children
        _this.parentDom = undefined
      },
      const: function constFn (Component, props, mode) {
        return this.addChild(global.private(this).componentUse.const(Component, props, mode))
      },
      el: function el (Component, props) {
        return this.addChild(global.private(this).componentUse.el(Component, props))
      },
      tag: function tag (name, props) {
        return this.addChild(global.private(this).componentUse.tag(name, props))
      },
      frag: function frag (props) {
        return this.addChild(global.private(this).componentUse.frag(props))
      },
      text: function text (str) {
        return this.addChild(global.private(this).componentUse.text(str))
      },
      addChild: function addChild (childDom) {
        var children = global.private(this).children
        setParentDom(childDom, this)
        children.push(childDom)
        return this
      },
      addList: function addList (list) {
        for (var i = 0; i < list.length; i++) {
          this.addChild(list[i])
        }
        return this
      },
      wrapList: function wrapList (list) {
        var dom = this.wrap()
        dom.addList(list)
        return this
      },
      wrapChild: function wrapChild (childDom) {
        var dom = this.wrap()
        dom.addChild(childDom)
        return this
      },
      wrap: function wrap () {
        var children = global.private(this).children
        var dom = children[children.length - 1]
        return dom || this
      },
      end: function end () {
        var _this = global.private(this)
        return _this.parentDom || this
      },
      getComponentName: function getComponentName () {
        var _this = global.private(this)
        return _this.component.tagName
      },
      hydrate: function hydrate (parentProps, parentEl, edge, useId) {
        parentProps = parentProps || {}
        var _this = global.private(this)
        setProps(_this.props, parentProps)
        Object.getPrototypeOf(Proto.getClassOf(_this.component)).hydrateExec.call(_this.component, _this.props, parentEl, edge, useId)
      },
      reRender: function reRender (parentEl, edgeEl, useId) {
        var _this = global.private(this)
        Object.getPrototypeOf(Proto.getClassOf(_this.component)).exec.call(_this.component, _this.props, parentEl, edgeEl, useId)
      },
      render: function render (parentProps, parentEl, edgeEl, useId) {
        parentProps = parentProps || {}
        var _this = global.private(this)
        setProps(_this.props, parentProps)
        Object.getPrototypeOf(Proto.getClassOf(_this.component)).exec.call(_this.component, _this.props, parentEl, edgeEl, useId)
      }
    }
  })
  var DomUse = Proto.class('DomUse', function (global) {
    var NativeManager = Proto.class('NativeManager', function (global) {
      function createAddRenderFn (_this) {
        return function addRenderFn (fn, e) {
          _this.renderFunctions.push({fn, e})
        }
      }
      return {
        new: function newFn () {
          var _this = global.private(this)
          _this.tags = {}
          _this.renderFunctions = []
          _this.addRenderFn = createAddRenderFn(_this)
          _this.frag = Fragment.new(_this.addRenderFn)
          _this.text = Text.new()
        },
        getText: function getText () {
          return global.private(this).text
        },
        getFrag: function getFrag () {
          return global.private(this).frag
        },
        getTag: function getTag (tagName) {
          var _this = global.private(this)
          if (!Util.hasOwn(_this.tags, tagName)) {
            _this.tags[tagName] = Tag.new(tagName, _this.addRenderFn)
          }
          return _this.tags[tagName]
        },
        renderDispatch: function renderDispatch () {
          var _this = global.private(this)
          _this.renderFunctions.forEach(function (obj) {
            obj.fn(obj.e)
          })
          _this.renderFunctions = []
        }
      }
    })
    function getComponent (instance) {
      return global.private(instance).renderedComponent
    }
    return {
      new: function newFn (reactDom, nativeManager) {
        var _this = global.private(this)
        _this.reactDom = reactDom
        _this.componentMark = ''
        _this.nativeManager = nativeManager || NativeManager.new()
        _this.use = ComponentUse.new(this, reactDom, _this.nativeManager)
        _this.props = {}
        _this.renderedComponent = undefined
        _this.elementStart = undefined
        _this.elementEnd = undefined
        _this.hydrateNow = undefined
      },
      getComponentUse: function getComponentUse () {
        return global.private(this).use
      },
      setRenderedComponent: function setRenderedComponent (component, componentMark) {
        var _this = global.private(this)
        _this.renderedComponent = component
        _this.componentMark = _this.componentMark || DomUse.maskTreeMark(componentMark || '')
      },
      setEdges: function setEdges (elementStart, elementEnd) {
        var _this = global.private(this)
        _this.elementStart = elementStart
        _this.elementEnd = elementEnd
      },
      setElement: function setElement (elementParent, props) {
        var _this = global.private(this)
        _this.elementParent = elementParent
        _this.props = props
      },
      hydrateNow: function hydrateNow () {
        var _this = global.private(this)
        if (!_this.hydrateNow) {
          var setter = _this.reactDom.state(this)[1]
          _this.hydrateNow = function () {
            setter(Util.noAction)
          }
        }
        return _this.hydrateNow
      },
      getConst: function getConst () {
        return global.private(this).reactDom.const(this)
      },
      setConst: function setConst () {
        var _this = global.private(this)
        _this.reactDom.const(this, _this.elementStart, _this.elementEnd)
      },
      isSameOf: function isSameOf (domUse)  {
        return Object.getPrototypeOf(getComponent(this)) === Object.getPrototypeOf(getComponent(domUse))
      },
      maskTreeMark: function maskTreeMark (mark) {
        return '0000'.slice(String(mark || '').length) + (mark || '')
      },
      newUseId: function newUseId (useId, childNumber)  {
        return (useId === undefined ? '' : useId + '.') + DomUse.maskTreeMark(childNumber)
      },
      get treeMark () {
        var _this = global.private(this)
        return _this.componentMark || ''
      },
      renderDispatch: function renderDispatch () {
        var _this = global.private(this)
        if (_this.componentMark = '0000') {
          _this.nativeManager.renderDispatch()
        }
      },
      hydrate: function hydrate () {
        var _this = global.private(this)
        var component = _this.renderedComponent
        var elementStart = _this.elementStart
        var elementEnd = _this.elementEnd && _this.elementEnd.nextSibling
        var props = _this.props
        var parent = _this.elementParent
        var node = elementStart
        while (node !== elementEnd) {
          node.dispatchEvent(new Event('dismont', {target: node}))
          node = node.nextSibling
        }
        Dom.new(component, props, this).hydrate(props, parent, {el: elementStart}, this.treeMark)
        _this.nativeManager.renderDispatch()
      },
      render: function render () {
        var _this = global.private(this)
        var component = _this.renderedComponent
        var elementStart = _this.elementStart
        var elementEnd = _this.elementEnd && _this.elementEnd.nextSibling
        var props = _this.props
        var parent = _this.elementParent
        var node = elementStart
        while (node !== elementEnd) {
          var removed = node
          node.dispatchEvent(new Event('dismont', {target: node}))
          node = node.nextSibling
          parent.removeChild(removed)
        }
        Dom.new(component, props, this).reRender(parent, node, this.treeMark)
        _this.nativeManager.renderDispatch()
      }
    }
  })

  var ComponentUse = Proto.class('ComponentUse', function (global) {
    var modes = {
      substitute: ConstSubstitute,
      precedent: ConstPrecedent,
      unchange: ConstUnchange,
      change: ConstChange,
      set: ConstSet,
      further: ConstFurther
    }
    return {
      new: function newFn (domUse, reactDom, nativeManager) {
        var _this = global.private(this)
        _this.domUse = domUse
        _this.reactDom = reactDom
        _this.nativeManager = nativeManager
        _this.lastState = undefined
        _this.Type = undefined
      },
      el: function el (Component, props) {
        var _this = global.private(this)
        var newDomUse = DomUse.new(_this.reactDom, _this.nativeManager)
        return Dom.new(Component.new(newDomUse), props, _this.domUse)
      },
      tag: function tag (name, props) {
        var _this = global.private(this)
        return Dom.new(_this.nativeManager.getTag(name), props, _this.domUse)
      },
      text: function text (str) {
        var _this = global.private(this)
        return Dom.new(_this.nativeManager.getText(), {text: str}, _this.domUse)
      },
      frag: function frag (props) {
        var _this = global.private(this)
        return Dom.new(_this.nativeManager.getFrag(), props, _this.domUse)
      },
      const: function constFn (Component, constProps) {
        var _this = global.private(this)
        var newUse = DomUse.new(_this.reactDom, _this.nativeManager)
        var component
        var mode = modes[constProps.mode] || constProps.mode
        if (Proto.prototypeof(mode, ConstComponent)) {
          component = mode.new(Component.new(newUse), newUse)
        } else {
          component = ConstRender.new(Component.new(newUse), newUse)
        }
        return Dom.new(component, constProps, _this.domUse)
      },
      state: function state (initial) {
        var _this = global.private(this)
        _this.lastState = _this.reactDom.state(_this.domUse, initial, _this.Type)
        _this.Type = undefined
        return _this.lastState
      },
      value: function value (initial) {
        return this.state(initial)[0]
      },
      out: function out (initial) {
        var _this = global.private(this)
        _this.lastState = _this.reactDom.state(_this.domUse, initial, _this.Type)
        _this.Type = undefined
        return Out.new(_this.lastState[1], _this.lastState[0])
      },
      weak: function weak (initial) {
        var _this = global.private(this)
        _this.lastState = _this.reactDom.weakState(_this.domUse, initial, _this.Type)
        _this.Type = undefined
        return _this.lastState[0]
      },
      ref: function ref (value) {
        var _this = global.private(this)
        return _this.reactDom.refState(_this.domUse, value)
      },
      of: function ofFn (Type) {
        var _this = global.private(this)
        _this.Type = Type
        return this
      },
      setter: function setter () {
        var _this = global.private(this)
        return _this.lastState[1]
      },
      effect: function effect (callback, dependencies) {
        var _this = global.private(this)
        return _this.reactDom.effect(_this.domUse, callback, dependencies)
      },
      clearEffect: function clearEffect (callback, dependencies) {
        var _this = global.private(this)
        return _this.reactDom.effect(_this.domUse, function () {return callback}, dependencies)
      },
      clearStates: function clearStates () {
        var _this = global.private(this)
        return _this.reactDom.clearStates(_this.domUse)
      },
      hydrateNow: function hydrateNow () {
        var _this = global.private(this)
        _this.domUse.hydrateNow()
        return Tag.continue
      },
      memo: function memo (callback, dependencies) {
        var _this = global.private(this)
        return _this.reactDom.memo(_this.domUse, callback, dependencies)
      }
    }
  })
  var Hook = Proto.abstract('Hook', function (global) {
    function getEdges (list, startMark) {
      var start = getCorrespondentId (list, startMark)
      while (start > 0 && startMark === list[start - 1].domUse.treeMark) {
        start--
      }
      var radical = startMark.slice(0, -4)
      var endMark = radical + DomUse.maskTreeMark(Number(startMark.slice(-4)) + 1)
      var end = getCorrespondentId(list, endMark)
      while (list[end] && endMark > list[end].domUse.treeMark.slice(0, endMark.length)) {
        end++
      }
      return {start, end}
    }
    function getCorrespondentId (list, treeMark) {
      var id = Util.searchNode(list, treeMark, function (item) {return item.domUse.treeMark})
      if (id > 0 && (id === list.length || Util.gt(treeMark, list[id].domUse.treeMark))) {
        id--
      }
      while (id > 0 && treeMark === list[id - 1].domUse.treeMark) {
        id--
      }
      return id
    }
    
    return {
      addNew: undefined,
      addSame: undefined,
      execQueue: function () {
      },
      new: function newFn () {
        var _this = global.private(this)
        _this.list = []
        _this.count = 0
        Util.var(this, 'onExecution', false)
      },
      get: function getFn () {
        var _this = global.private(this)
        return _this.list[_this.count]
      },
      set: function setFn (data) {
        var _this = global.private(this)
        _this.list[_this.count] = data
        _this.count++
      },
      list (cb) {
        var _this = global.private(this)
        return _this.list.map(cb)
      },
      setup: function setup (data) {
        var _this = global.private(this)
        _this.list[_this.count] = data
      },
      walk: function walk (callback) {
        var _this = global.private(this)
        for (var i = _this.count; i < _this.list.length; i++) {
          callback(_this.list[i])
        }
      },
      isNew: function isNew () {
        var _this = global.private(this)
        return _this.count > _this.list.length -1
      },
      cropList: function cropList () {
        var _this = global.private(this)
        _this.list.length = _this.count
      },
      refreshCount: function refreshCount () {
        var _this = global.private(this)
        _this.count = _this.list.length
      },
      get count () {
        var _this = global.private(this)
        return _this.count
      },
      isolate: function isolate (treeMark) {
        var _this = global.private(this)
        if (_this.list.length === 0) {
          return []
        }
        var id = getCorrespondentId(_this.list, treeMark)
        if (treeMark > _this.list[id].domUse.treeMark.slice(0, treeMark.length)) {
          return []
        }
        var edges = getEdges(_this.list, treeMark)
        _this.count = edges.start
        var residual = _this.list.slice(edges.end)
        _this.list = _this.list.slice(0, edges.end)
        return residual
      },
      regroup: function regroup (residual) {
        this.cropList()
        for (var i = 0; i < residual.length; i++) {
          this.set(residual[i])
        }
        this.refreshCount()
      },
      add: function add (domUse, data, Type) {
        if (!this.isNew() && domUse.isSameOf(this.get().domUse)) {
          return this.addSame(domUse, data, Type)
        }
        return this.addNew(domUse, data, Type)
      }
    }
  })
  var Const = Proto.class('Const', function (global) {
    global.extends(Hook)
    var DataConst = DataClass.create('DataConst', [
      ['domUse', DomUse],
      ['constList', Array]
    ])
    return {
      add: function add (domUse, elements) {
        var constList
        if (!this.isNew() && domUse === this.get().domUse) {
          constList = this.addSame(domUse)
          constList.length = 0
          if (elements.start) {
            var node = elements.start
            var edgeNode = elements.end.nextSibling
            while (node !== edgeNode) {
              constList.push(node)
              node = node.nextSibling
            }
          }
        } else {
          constList = this.addNew(domUse)
        }
        return constList.slice()
      },
      addNew: function addNew (domUse) {
        var dataConst = this.get()
        if (!dataConst) {
          dataConst = DataConst.new(domUse, [])
        } else {
          dataConst.domUse = domUse
        }
        this.setup(dataConst)
        return dataConst.constList
      },
      addSame: function addSame (domUse) {
        var dataConst = this.get()
        this.set(dataConst)
        return dataConst.constList
      }
    }
  })
  var Memo = Proto.class('Memo', function (global) {
    global.extends(Hook)
    var DataMemo = DataClass.create('DataMemo', [
      ['domUse', DomUse],
      ['value', Proto.Any],
      ['dependencies', Array]
    ])
    return {
      addSame: function addSame (domUse, data) {
        var memo = this.get()
        var active = false
        if (memo.dependencies) {
          for (var i = 0; i < memo.dependencies.length; i++) {
            if (!Util.isEqual(memo.dependencies[i], data.dependencies[i])) {
              active = true
              break
            }
          }
        } else {
          active = true
        }
        if (active) {
          memo = DataMemo.init({
            domUse,
            value: data.callback.apply({}, data.dependencies || []),
            dependencies: data.dependencies
          })
        }
        memo.domUse = domUse
        this.set(memo)
        return memo.value
      },
      addNew: function addNew (domUse, data) {
        var result = data.callback.apply({}, data.dependencies || [])
        this.set(DataMemo.new(domUse, result, data.dependencies))
        return result
      }
    }
  })
  var RefState = Proto.class('RefState', function (global) {
    global.extends(Hook)
    var DataRef = DataClass.create('DataRef', [
      ['domUse', DomUse],
      ['value', Proto.Any]
    ])
    return {
      addSame: function addSame (domUse) {
        var dataRef = this.get()
        dataRef.domUse = domUse
        this.set(dataRef)
        return dataRef.value
      },
      addNew: function addNew (domUse, value) {
        this.set(DataRef.new(domUse, value))
        return value
      }
    }
  })
  var Effect = Proto.class('Effect', function (global) {
    global.extends(Hook)
    function noFn () {}
    var DataEffect = DataClass.create('DataEffect', [
      ['domUse', DomUse],
      ['callback', Function],
      ['dependencies', Box.of(Proto.Any).guard(function (dependencies) {
        return dependencies === undefined || dependencies instanceof Array
      })],
      ['clear', Box.of(Function).with(noFn)]
    ])
    function newClearFunc (fn, dependencies) {
      return function () {
        fn.apply({}, dependencies || [])
      }
    }
    function apply (dataEffect) {
      this.onExecution = true
      if (dataEffect.callback === noFn) {
        dataEffect.clear()
        this.onExecution = false
        return
      }
      dataEffect.clear()
      var newClear = dataEffect.callback()
      if (newClear) {
        dataEffect.clear = newClearFunc(newClear, dataEffect.dependencies)
      }
      this.onExecution = false
    }
    return {
      new: function newFn () {
        global.super()
        var _this = global.private(this)
        _this.queue = []
      },
      regroup: function regroup (residual) {
        var _this = global.private(this)
        this.walk(function (dataEffect) {
          _this.queue.push(DataEffect.new(dataEffect.domUse,  noFn, dataEffect.dependencies, dataEffect.clear))
        })
        this.execQueue()
        Hook.regroup.call(this, residual)
      },
      execQueue: function execQueue () {
        var _this = global.private(this)
        for (var i = 0; i < _this.queue.length; i++) {
          apply.call(this, _this.queue[i])
        }
        _this.queue = []
      },
      addSame: function addSame (domUse, data) {
        var _this = global.private(this)
        var dataEffect = this.get()
        var active = false
        if (dataEffect.dependencies) {
          for (var i = 0; i < dataEffect.dependencies.length; i++) {
            if (!Util.isEqual(dataEffect.dependencies[i], data.dependencies[i])) {
              active = true
              break
            }
          }
        } else {
          active = true
        }
        dataEffect.domUse = domUse
        dataEffect.callback = data.callback
        dataEffect.dependencies = data.dependencies
        if (active) {
          _this.queue.push(dataEffect)
        }
        this.set(dataEffect)
      },
      addNew: function addNew (domUse, data) {
        var dataEffect = this.get()
        if (!dataEffect) {
          dataEffect = DataEffect.new(domUse, data.callback, data.dependencies)
        } else {
          dataEffect.domUse = domUse
          dataEffect.clear = noFn
          dataEffect.dependencies = data.dependencies
          dataEffect.callback = data.callback
        }
        this.set(dataEffect)
        global.private(this).queue.push(dataEffect)
      }
    }
  })

  var WeakState = Proto.class('WeakState', function (global) {
    return {
      new: function newFn (stateHook) {
        var _this = global.private(this)
        _this.stateHook = stateHook
      },
      add: function add (domUse, data, Type) {
        var _this = global.private(this)
        var stateHook = _this.stateHook
        if (!stateHook.isNew() && domUse === stateHook.get().domUse) {
          return stateHook.addSame(domUse, data, Type)
        }
        return stateHook.addNew(domUse, data, Type)
      },
    }
  })

  var ClearStates = Proto.class('ClearStates', function (global) {
    function clear (domUse) {
      domUse.setRenderedComponent(ClearState.new(domUse), domUse.treeMark)
    }
    return {
      new: function newFn (stateHook) {
        var _this = global.private(this)
        _this.stateHook = stateHook
      },
      add: function add (domUse) {
        var _this = global.private(this)
        var stateHook = _this.stateHook
        var setter = stateHook.addNew(domUse, domUse)[1]
        return function () {setter(clear)}
      },
    }
  })

  var State = Proto.class('State', function (global) {
    global.extends(Hook)
    var Setter = Proto.class('Setter', function (global) {
      return {
        new: function newFn (stateHook, dataState) {
          var _this = getStatePrivateThis.call(stateHook)
          Util.def(this, 'setState', function (state)  {
            if (!Util.isEqual(dataState.state, state)) {
              if (typeof state === 'function') {
                state = state(dataState.state)
                dataState.hydrate = Util.isEqual(dataState.state, state)
              }
              dataState.state = state
              _this.queue.push(dataState)
              if (!stateHook.onExecution && !_this.hooks.some(function (hook) {return hook.onExecution})) {
                setTimeout(function () {
                  try{stateHook.execQueue()} catch(e) {alert(e);throw e}
                }, 0)
              }
            }
          })
        }
      }
    })
    var DataState = DataClass.create('DataState', [
      ['domUse', DomUse],
      ['state', GenericRef.type],
      ['setter', Setter],
      ['hydrate', Box.of(Boolean).with(false)]
    ],
    [Generic])
    function getStatePrivateThis () {
      return global.private(this)
    }
    function apply (domUse, hydrate) {
      var residual = this.isolate(domUse.treeMark)
      this.onExecution = true
      if (hydrate) {
        domUse.hydrate()
      } else {
        domUse.render()
      }
      this.onExecution = false
      this.regroup(residual)
    }
    return {
      new: function newFn (hooks) {
        global.super()
        var _this = global.private(this)
        _this.queue = []
        _this.hooks = hooks || []
      },
      execQueue: function execQueue () {
        var _this = global.private(this)
        for (var i = 0; i < _this.queue.length; i++) {
          var dataState = _this.queue[i]
          var domUse = dataState.domUse
          var hooksResiduals = _this.hooks.map(function (hook) {return hook.isolate(domUse.treeMark)})
          apply.call(this, domUse, dataState.hydrate)
          dataState.hydrate = false
          _this.hooks.forEach(function (hook) {return hook.execQueue()})
          _this.hooks.forEach(function (hook, i) {return hook.regroup(hooksResiduals[i])})
        }
        _this.queue = []
      },
      addNew: function addNew (domUse, initial, Type) {
        var dataState = this.get()
        var setter
        if (!dataState || Type !== dataState.getType()) {
          setter = Setter.new(this, DataState.void)
          dataState = DataState.of(Type, [[domUse, initial, setter]])
          setter = Setter.new(this, dataState)
          dataState.setter = setter
        } else {
          setter = dataState.setter
          dataState.domUse = domUse
          dataState.state = initial
        }
        this.set(dataState)
        return [initial, setter.setState]
      },
      addSame: function addSame (domUse) {
        var dataState = this.get()
        var state = dataState.state
        var setter = dataState.setter
        dataState.domUse = domUse
        this.set(dataState)
        return [state, setter.setState]
      }
    }
  })
  var ReactDom = Proto.class('ReactDom', function (global) {
    function start (RootComponent, rootEl, forceRender) {
        var _this = global.private(this)
        _this.state.onExecution = true
        var use = DomUse.new(this)
        var dom = Dom.new(RootComponent.new(use), {}, use)
        try {
          if (rootEl.children.length > 0) {
            if (forceRender) {
              rootEl.innerHTML = ''
              dom.render({}, rootEl)
            } else {
              dom.hydrate({}, rootEl, {el: rootEl.children[0]})
            }
          } else {
            dom.render({}, rootEl)
          }
          use.renderDispatch()
        } catch (e) {
          alert (e)
          throw e
        }
        _this.state.onExecution = false
        try {
          _this.hooks.forEach(function (hook) {return hook.execQueue()})
        } catch (e) {
          alert (e)
          throw e
        }
      }
    return {
      new: function newFn  (RootComponent, rootEl, forceRender) {
        var _this = global.private(this)
        _this.effect = Effect.new()
        _this.const = Const.new()
        _this.memo = Memo.new()
        _this.refState = RefState.new()
        _this.hooks = [_this.const, _this.refState, _this.effect, _this.memo]
        _this.state = State.new(_this.hooks)
        _this.weakState = WeakState.new(_this.state)
        _this.clearStates = ClearStates.new(_this.state)
        start.call(this, RootComponent, rootEl, forceRender)
      },
      const: function constFn (domUse, elementStart, elementEnd) {
        return global.private(this).const.add(domUse, {start: elementStart, end: elementEnd})
      },
      memo: function memo (domUse, callback, dependencies) {
        return global.private(this).memo.add(domUse, {callback: callback, dependencies: dependencies})
      },
      effect: function effect (domUse, callback, dependencies) {
        return global.private(this).effect.add(domUse, {callback: callback, dependencies: dependencies})
      },
      state: function state (domUse, initial, Type) {
        return global.private(this).state.add(domUse, initial, Type)
      },
      weakState: function weakState (domUse, initial, Type) {
        return global.private(this).weakState.add(domUse, initial, Type)
      },
      clearStates: function clearStates (domUse) {
        return global.private(this).clearStates.add(domUse)
      },
      refState: function refState (domUse, value) {
        return global.private(this).refState.add(domUse, value)
      }
    }
  })
  return {
    Component,
    Model,
    Out,
    Context,
    ReactDom,
    ServerInterface
  }
})