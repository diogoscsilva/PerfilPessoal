"use strict"
Proto.module('Calculator', function (imports) {

  var Component = imports.ReactUse.Component
  var Model = imports.ReactUse.Model
  var Record = imports.DataTypes.Record
  var Context = imports.ReactUse.Context
  var Out = imports.ReactUse.Out
  var Calc = imports.Calc.Calc
  var PercentCalc = imports.Calc.PercentCalc
  var PowerCalc = imports.Calc.PowerCalc
  var Comparator = imports.Calc.Comparator
  var LogicalAnd = imports.Calc.LogicalAnd
  var LogicalOr = imports.Calc.LogicalOr

  var Calculator = Component.create('Calculator', {
    render (props) {
      var use = this.use
      var context = Context.new()
      var calc = Calc.new()
      var strNumber = ''
      var operator
      var decimal = false
      function getCalcString (dot) {
        var str = calc.toString()
        var strDot = dot && '.' || ''
        var strOperator = operator && operator.get(String, {default: function (str)  {return str}}) || ''
        if (/(^-0$|^-0\.0*)/.test(strNumber)) {
          return strNumber
        } else if (/\.0*$/.test(strNumber)) {
          if (str === '0' || str === '') {
            return '0' + strNumber
          } else if (operator && dot) {
            return str + strOperator + '0' + strNumber
          }
          return str + strOperator + strNumber.replace(/\d*(\.0*)/, '$1')
        } else if (operator) {
          return str + strOperator
        } else if (str !== '') {
          return str + strDot
        }
        return '0'
      }
      function setCalc (dot) {
        context.set('expression', getCalcString(dot))
        var result = calc.result()
        context.set('result', result.isKindOf('Invalid') ? '0' : result.getString())
      }
      function addOperator (op) {
        if (op && op.isKindOf('Sub') && calc.isEmpty()) {
          strNumber = '-'
        } else {
          strNumber = ''
        }
        decimal = false
        operator = op
        setCalc()
      }
      function setOperator () {
        if (operator) {
          calc.operator(operator)
          operator = undefined
        } else {
          var lastTerm = calc.lastTerm
          if (lastTerm && lastTerm.isKindOf('Mod')) {
            var mod = lastTerm.force('Mod')
            calc.mod(mod.make({op: PercentCalc.Percent()}))
            calc.operator(PercentCalc.ShadowMultiplication())
          }
        }
      }
      var keys = {
        addNumber (number) {
          setOperator()
          strNumber += number
          calc.number(Number(strNumber))
          setCalc()
        },
        divide () {
          addOperator(Calc.divide)
        },
        times () {
          addOperator(Calc.times)
        },
        minus () {
          addOperator(Calc.minus)
        },
        plus () {
          addOperator(Calc.plus)
        },
        power () {
          addOperator(PowerCalc.Power())
        },
        percent () {
          if (!calc.isEmpty()
          && (!calc.hasOperator() || calc.lastOperator.getPriority() === 0)
          && !calc.lastTerm.isKindOf('Mod')) {
            calc.mod({
              char: '%',
              op : PercentCalc.PercentSum(),
              term: calc.lastTerm
            })
            addOperator()
          } else {
            var lastTerm = calc.lastTerm
            if (lastTerm) {
              if (lastTerm.isKindOf('Mod')) {
                var mod = lastTerm.force('Mod')
                calc.mod(mod.make({op: PercentCalc.Percent()}))
              }
              addOperator()
              calc.operator(PercentCalc.ShadowMultiplication())
            }
            calc.symbol(Record.init({
              char: '%',
              value: 0.01
            }))
            setCalc()
          }
        },
        parenthesis () {
          if (strNumber === '' && (!calc.lastTerm || !calc.lastTerm.isKindOf('Mod'))) {
            setOperator()
            calc.openParenthesis()
          } else {
            addOperator()
            calc.closeParenthesis()
          }
          setCalc()
        },
        dot () {
          if (!decimal) {
            decimal = true
            if (strNumber === '-') {
              strNumber += '0'
            } else if (strNumber === '0') {
              strNumber = ''
            }
            strNumber += '.'
            setCalc(true)
          }
        },
        pi () {
          setOperator()
          addOperator()
          calc.symbol(Record.init({
            char: 'π',
            value: 3.1415926535897
          }))
          setCalc()
        },
        equal () {
          calc.equal()
          addOperator()
        },
        refresh () {
          calc = Calc.new()
          addOperator()
        }
      }
      return use.tag('div', {context, className: 'w-48'})
        .el(Visor, {name: 'expression'})
        .el(Visor, {name: 'result'})
        .el(KeyBoard, keys)
      .end()
    }
  })
  var Visor = Component.create('Visor', {
    render (props) {
      var use = this.use
      var value = use.out('0')
      props.context.setup(props.name, value)
      return use.tag('div', {className: 'text-right'})
        .text(value.out)
      .end()
    }
  })
  var CalcKey = Component.create('CalcKey', {
    render (props) {
      return this.use.tag('input', {type: 'button', value: props.value, onClick: function () {props.setValue(props.value)}})
    }
  })
  var KeyRow = Component.create('KeyRow', {
    render (props) {
      var use = this.use
      return use.tag('keyRow', {className: 'flex-row'})
        .addList(props.children)
      .end()
    }
  })
  var KeyBoard = Component.create('KeyBoard', {
    render (props) {
      var use = this.use
      return use.tag('keyBoard', {className: 'flex-col'})
        .el(KeyRow)
        .wrap()
          .el(CalcKey, {value: '\u21BB', setValue: props.refresh})
          .el(CalcKey, {value: 7, setValue: props.addNumber})
          .el(CalcKey, {value: 8, setValue: props.addNumber})
          .el(CalcKey, {value: 9, setValue: props.addNumber})
          .el(CalcKey, {value: '+', setValue: props.plus})
          .el(CalcKey, {value: '×', setValue: props.times})
          .el(CalcKey, {value: '^', setValue: props.power})
        .end()
        .el(KeyRow)
        .wrap()
          .el(CalcKey, {value: '()', setValue: props.parenthesis})
          .el(CalcKey, {value: 4, setValue: props.addNumber})
          .el(CalcKey, {value: 5, setValue: props.addNumber})
          .el(CalcKey, {value: 6, setValue: props.addNumber})
          .el(CalcKey, {value: '-', setValue: props.minus})
          .el(CalcKey, {value: '÷', setValue: props.divide})
          .el(CalcKey, {value: '%', setValue: props.percent})
        .end()
        .el(KeyRow)
        .wrap()
          .el(CalcKey, {value: 0, setValue: props.addNumber})
          .el(CalcKey, {value: 1, setValue: props.addNumber})
          .el(CalcKey, {value: 2, setValue: props.addNumber})
          .el(CalcKey, {value: 3, setValue: props.addNumber})
          .el(CalcKey, {value: ' . ', setValue: props.dot})
          .el(CalcKey, {value: '=', setValue: props.equal})
          .el(CalcKey, {value: 'π', setValue: props.pi})
        .end()
      .end()
    }
  })
  return {
    Calculator
  }
})