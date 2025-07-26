"use strict"

Proto.module('Containers', function (imports) {
  var Component = imports.ReactUse.Component
  var Model = imports.ReactUse.Model
  var ObjectMethods = imports.ObjectIterator.ObjectMethods

  var ConstItems = Component.create('ConstItems', {
    render (props) {
      return this.use.frag()
        .addList(props.children)
      .end()
    }
  })

  function makeConstList (use, rows, props) {
    var list = []
    for (var i = 0; i < rows.length; i++) {
      list.push(use.el(props.Component, ObjectMethods.assign.call(rows[i], props.componentProps || {})))
    }
    return list
  }


  function focus (el) {
    el.dispatchEvent(new Event('cardFocus', {bubbles: true}))
  }

  var ConstContainer = Component.create('ConstContainer', {

    makeConstModel: function makeConstModel (stateName, adjustFn) {
      adjustFn = adjustFn || function (message) {
        return message
      }
      function adjustMessage (state, message) {
        return adjustFn(message)
      }
      return Model.new({
        [stateName]: Model.newRedux([], {
          substitute: adjustMessage,
          unchange: adjustMessage,
          change: adjustMessage,
          precedent: adjustMessage,
          set: adjustMessage,
          further: adjustMessage
        })
      })
    },

    render: function render (props) {
      var use = this.use
      var ref = use.ref({
        top: 0,
        temp: [],
        unsubscribe: Util.noAction
      })
      var tempLength = ref.temp.length
      var constState = use.out([[], 'render'])
      function constSetter (getter, mode) {
        constState.set(function () {
          return [getter(), mode]
        })
      }
      var rows = constState.out[0]
      var mode = constState.out[1]
      constState.out[0] = []
      constState.out[1] = 'render'
      use.effect(function () {
        ref.unsubscribe = props.subscribe(constSetter)
        return function () {
          ref.unsubscribe()
        }
      }, [])
      function adjustScroll (e) {
        var thisEl = e.target
        if (thisEl) {
          if (mode === 'render') {
            thisEl.scrollTop = ref.top
          } else {
            if (mode === 'set') {
              thisEl.scrollTop = thisEl.scrollHeight - thisEl.clientHeight
              ref.top = thisEl.scrollTop
            }
            focus(thisEl)
          }
        }
      }
      if (mode !== 'render') {
        if (mode === 'unchange') {
          Util.insert(ref.temp, ref.temp.length, rows)
        } else if (mode === 'change') {
          props.change(rows)
        } else if (mode === 'further') {
          var furtherRows = rows.slice()
          for (var i = 0; i < ref.temp.length; i++) {
            var index = rows.findIndex(function (row) {
              if (props.dependencies) {
                return props.dependencies.every(function (key) {
                  return Util.isEqual(row[key], ref.temp[i][key])
                })
              } else {
                return Util.isEqual(row, ref.temp[i])
              }
            })
            if (index > -1) {
              furtherRows = furtherRows.slice(index)
              ref.temp.splice(0, i + 1)
              i = 0
            }
          }
        }
        ref.temp.unsubscribe = props.subscribe(constSetter)
      }
      var tempComponents = makeConstList(use, ref.temp, props)
      var constComponents = makeConstList(use, rows, props)
      var onWait = false
      return use.frag({
        onScroll: function (e) {
          ref.top = e.target.scrollTop
          if (!onWait && e.target.scrollTop === 0) {
            onWait = true
            props.refresh()
            .then(function () {
              onWait = false
            })
          }
        },
        onRender: adjustScroll
      })
        .const(ConstItems, {mode, getRange: props.getRange})
          .wrapList(constComponents)
        .addList(tempComponents)
      .end()
    }
  })

  var SideBox = Component.create('SideBox', {
    render (props) {
      return this.use.tag('sideBox', {className: 'overflow-auto cursor-deflaut flex-col gap-y-2_5'})
        .addList(props.children)
      .end()
    }
  })

  var TextBox = Component.create('TextBox', {
    render (props) {
      return this.use.tag('textBox', {className: 'block clear-both w-5by6 m-1 self-' + props.float || 'start'})
        .addList(props.children)
      .end()
    }
  })
  function getRatio (parentEl) {
    return parentEl.scrollLeft / parentEl.children[0].scrollWidth
  }
  var Carousel = Component.create('Carousel', {
    render (props) {
      var use = this.use
      var parentEl
      var ref = props.vertical && 'top' || 'left'
      var cards = props.children
      use.effect(function () {
        if (cards.length > 0) {
          scroll(props.selected || 0)
        }
      }, [cards.length])
      function refocus (el) {
        var ratio = getRatio(parentEl)
        var index = Math.floor(ratio + 0.5)
        if (inZone(index, ratio) && el === parentEl.children[index]) {
          el.dispatchEvent(new Event('focus'))
        }
      }
      function scroll (cardNumber) {
        if (parentEl.children.length === 1) {
          refocus(parentEl.children[0])
        } else {
          var el = parentEl.children[cardNumber]
          var start = parentEl.children[0].getBoundingClientRect()[ref]
          var rect = el.getBoundingClientRect()
          var scroll = {
            behavior: 'smooth',
            [ref]: rect[ref] - start - parentEl.getBoundingClientRect()[ref]
          }
          parentEl.scroll(scroll)
        }
      }
      function inZone (index, ratio) {
        return ratio > index - 0.1 && ratio < index + 0.1
      }
      function focusInZone (index) {
        return function () {
          if (inZone(index, getRatio(parentEl))) {
            refocus(parentEl.children[index])
          }
        }
      }
      function onScroll (e) {
        var parentEl = e.target
        var ratio = getRatio(parentEl)
        var index = Math.floor(ratio + 0.5)
        if (inZone(index, ratio)) {
          setTimeout(focusInZone(index), 50)
        }
      }
      function onRender (e) {
        parentEl = e.target
        for (var i = 0; i < parentEl.children.length; i++) {
          var el = parentEl.children[i]
          e.addListener(el, 'cardFocus', function (e) {
            refocus(el)
          })
        }
      }
      var z = props.vertical && 'y' || 'x'
      props.scrollFn.set(scroll)
      return use.tag('div', {className: 'flex-row overflow-'+z+'-auto snap-'+z+' snap-center scrollbar-invisible', onRender, onScroll})
        .addList(cards)
      .end()
    }
  })

  function toggle (el) {
    var children = el.parentElement.children
    for (var i = 0; i < children.length; i++) {
      var child = children[i]
      if (!(/^\s*(hydrate-defer\s+)?none(\s+|$)/.test(child.className))) {
        child.className = 'none ' + child.className
      }
    }
    el.className = el.className.replace(/^\s*(hydrate-defer\s+)?none(?:\s+|$)/, '$1')
  }

  var Switcher = Component.create('Switcher', {
    render (props) {
      var el
      function switchFn (index) {
        toggle(el.children[index])
        el.children[index].dispatchEvent(new Event('focus'))
        el.children[index].dispatchEvent(new Event('switch', {bubbles: true}))
      }
      props.switchFn.set(switchFn)
      return this.use.frag({
        onRender: function (e) {
          el = e.target
          toggle(el.children[props.selected || 0])
        }
      })
        .addList(props.children)
      .end()
    }
  })

  var Modal = Component.create('Modal', {
    render: function (props) {
      var use = this.use
      var active = use.value(false)
      var setActive = use.setter()
      props.modalOn.set(setActive)
      return use.tag('div', {className: (active ? "block " : "none ")
      + "absolute inset-0 flex items-center justify-center z-10"})
      .addList(props.children)
    }
  })
  
  return {
    ConstContainer,
    SideBox,
    TextBox,
    Carousel,
    Switcher,
    Modal
  }
})

Proto.module('Form', function (imports) {
  var Component = imports.ReactUse.Component
  var Context = imports.ReactUse.Context
  var Out = imports.ReactUse.Out
  var ObjectMethods = imports.ObjectIterator.ObjectMethods

  function inputEvent (type, el) {
    return function () {
      el.dispatchEvent(new Event(type, {bubbles: true}))
    }
  }
  var selectedInputs = ['password', 'search', 'tel', 'text', 'url']
  function getInputIndex (el) {
    var inputs = el.getElementsByTagName('input')
    var input = document.activeElement
    for (var i = 0; i < inputs.length; i++) {
      if (input === inputs[i]) {
        return i
      }
    }
    return -1
  }
  
  var Form = Component.create('Form', {
    addSelectListeners: function addInputListeners (e, inputData) {
      function onSelection () {
        var el = document.activeElement
        inputData.start = el.selectionStart
        inputData.end = el.selectionEnd
        inputData.direction = el.selectionDirection
      }
      function onFocus () {
        var input = document.activeElement
        if (selectedInputs.includes(input.type)) {
          input.setSelectionRange(inputData.start, inputData.end, inputData.direction)
        }
      }
      e.addListener(e.target, 'selectFocus', onFocus)
      e.addListener(e.target, 'inputSelect', onSelection)
    },
    addFocusListeners: function addInputListeners (e, inputData) {
      inputData.index = inputData.index || 0
      var el = e.target
      function onFocus (e) {
        var label = e.target.getElementsByTagName('label')[inputData.index]
        label.focus()
        el.dispatchEvent(new Event('selectFocus'))
      }
      e.addListener(el, 'focus', onFocus)
      e.addListener(el, 'focusin', function (e) {
        inputData.index = getInputIndex(el)
      })
    },
    render (props) {
      var use = this.use
      var context = use.ref(Context.new())
      function onRender (e) {
        var parentEl = e.target
        var inputs = parentEl.getElementsByTagName('input')
        for (var i = 0; i < inputs.length; i++) {
          e.addListener(inputs[i], 'select', inputEvent('inputSelect', inputs[i]))
        }
      }
      return use.frag({
        context,
        onRender
      })
        .addList(props.children)
      .end()
    }
  })
  var Input = Component.create('Input', {
    render (props) {
      var use = this.use
      var input = use.out(Util.hasOwn(props, 'value') ? props.value : '')
      props.context.setup(props.name, input)
      var onInput = props.onInput || Util.noAction
      var onChange = props.onChange || Util.noAction
      var inputField = function inputField (e) {
        props.context.setup(props.name, [e.target.value, function (value) {input.set(value)}])
        onInput.call(this, e)
      }
      function changeField (e) {
        props.context.setup(props.name, [e.target.value])
        input.set(e.target.value)
        onChange.call(this, e)
      }
      var inputProps = ObjectMethods.assign.call(props, {type: props.type || 'text', onChange: changeField})
      if (props.type === 'checkbox' || props.type === 'radio') {
        if (Util.hasOwn(props, 'checked')) {
          inputProps.onRender = function check (e) {
            props.context.setup(props.name, [e.target.value, function (value) {input.set(value)}])
            e.target.click()
          }
        }
      } else {
        inputProps.onInput = inputField
        inputProps.value = input.out
      }
      return use.tag('input', inputProps)
    }
  })

  var Submit = Component.create('Submit', {
    render (props) {
      function submit () {
        props.submit(props.context)
      }
      var submitProps = ObjectMethods.assign.call(props, {type: 'submit',  onClick: submit})
      return this.use.tag('input', submitProps)
    }
  })

  return {
    Form,
    Input,
    Submit
  }
})
