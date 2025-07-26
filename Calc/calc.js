Proto.module('Calc', function (imports) {
    var TypeRef = imports.Ref.TypeRef
    var Box = imports.Box.Box
    var Enum = imports.DataTypes.Enum
    var Record = imports.DataTypes.Record

    var Operator = Proto.interface('Operator', function (global) {
    return {
      calc () {
        return Term.Invalid()
      },
      exec (terms, index) {
        var thisOperator = this
        return this.get(Term, {
          default () {
            var term0
            var term1
            var index0 = 2 * index + 1
            if (Util.hasOwn(terms, index0)) {
              term0 = terms[index0].exec(terms, index0)
              if (term0.isKindOf('Invalid')) {
                return term0
              }
            } else if (term0 === undefined) {
              return Term.Invalid()
            }
            var index1 = 2 * index + 2
            if (Util.hasOwn(terms, index1)) {
              term1 = terms[index1].exec(terms, index1)
              if (term1.isKindOf('Invalid')) {
                return term1
              }
            } else {
              return term0
            }
            return thisOperator.calc(term0, term1.modTerm(term0))
          }
        })
      },
      return (operandType, result) {
        try {
          return Term[operandType](result)
        }
        catch (e) {
          return Term.Invalid()
        }   
      }
    }
  })
  var Mod = Record.create('Mod', {
    term: TypeRef.new(function () {return Term.Invalid()}),
    char: '',
    op: Box.of(Operator)
  })
  var Symbol = Record.create('Symbol', {
    value: 0,
    char: ''
  })
  var Operand = Enum.create('Operand', [
    ['Number' , Number],
    ['Boolean', Boolean],
    ['String', String],
    ['Symbol', Symbol],
    ['Mod', Mod]
  ])
  var Expression = Record.create('Expression', {
    lastTerm: 0,
    terms: TypeRef.new(function () {return Record.boxOf(Term)})
  })
  var TermMethods = Proto.interface('TermMethods', function (global) {
    function addOperand (operand) {
      var record = this.forceExpression()
      if (record.terms.isEmpty()) {
        return this.makeSame(record.make({
          terms: Record.init({0: operand})
        }))
      }
      var lastTerm = record.lastTerm
      if (record.terms[record.lastTerm].isKindOf('Operator')) {
        lastTerm =  2 * lastTerm + 2
      }
      var terms = record.terms.toObject()
      terms[lastTerm] = operand
      terms = Record.init(terms)
      return this.makeSame(record.make({
        lastTerm,
        terms
      }))
    }
    function addTermOperator (termOperator) {
      var record = this.forceExpression()
      if (record.terms.isEmpty()) {
        return this
      } else if (record.terms[record.lastTerm].isKindOf('Operator')) {
        throw new TypeError('Invalid operation')
      } else if (record.lastTerm === 0) {
        return this.makeSame(record.make({
          terms: Record.init({0: termOperator, 1: record.terms[0]})
        }))
      }
      var terms = record.terms.toObject()
      var lowPriorityOperator = (record.lastTerm - 2) / 2
      while (lowPriorityOperator > -1 && !terms[lowPriorityOperator].isLowPriority(termOperator)) {
        lowPriorityOperator = (lowPriorityOperator - 2) / 2
      }
      var lastTerm = 2 * lowPriorityOperator + 2
      this.setInitial(terms, lastTerm)
      terms[lastTerm] = termOperator
      return this.make('Expression', record.make({
        lastTerm,
        terms: Record.init(terms)
      }))
    }
    function setDeep (terms, index, deep) {
      if (!Util.hasOwn(terms, index)) {
        return
      }
      setDeep(terms, 2 * index + 1, deep)
      setDeep(terms, 2 * index + 2, deep +  1)
      var newIndex = index * 2 + 2 - (deep > 0 ? index % 2 : 0) - 2 ** deep
      if (Util.hasOwn(terms, newIndex)) {
        throw new RangeError('Impossible to arrange')
      }
      terms[newIndex] = terms[index]
      delete terms[index]
    }
    function getTermString (terms, index) {
      if (Util.hasOwn(terms, index)) {
        return getDeepTermString(terms, index)
      }
      return ''
    }
    function getDeepTermString (terms, index) {
      var str = ''
      str += getTermString(terms, 2 * index + 1)
      str += terms[index].get(String, {
        Expression: function (record) {return '(' + (Util.hasOwn(record.terms, 0) && getTermString(record.terms, 0) || '')},
        EmbeddedExpression: function (record) {return '(' + getTermString(record.terms, 0) + ')'},
        default: function () {return terms[index].getString()},
      })
      return str += getTermString(terms, 2 * index + 2)
    }
    return {
    setInitial (terms, index) {
      if (!Util.hasOwn(terms, index)) {
        return
      }
      setDeep(terms, index, 0)
    },
    exec (terms, index) {
      var execExpression = function (record) {return !record.terms.isEmpty() && record.terms[0].exec(record.terms, 0) || Term.Invalid()}
      var thisTerm = this
      return this.get(Term, {
        Expression: execExpression,
        EmbeddedExpression: execExpression,
        Operator (operator) {
          return operator.exec(terms, index)
        },
        default: function () {return thisTerm}
      })
    },
    modTerm (term0) {
      var thisTerm = this
      return this.get(Term, {
        Mod: function (record) {return record.op.calc(term0, record.term)},
        default: function () {return thisTerm}
      })
    },
    getNumber () {
      var thisTerm = this
      var getExpressionValue = function () {return thisTerm.exec().getNumber()}
      return this.get(Number, {
        Number: function (number) {return number},
        Symbol: function (record) {return record.value},
        Mod: function (record) {return record.op.calc(undefined, record.term).getNumber()},
        Expression: getExpressionValue,
        EmbeddedExpression: getExpressionValue,
        default: function () {
          throw new TypeError('Invalid term Number')
        }
      })
    },
    getValue () {
      var thisTerm = this
      var getExpressionValue = function () {return thisTerm.exec().getValue()}
      return this.get(Proto.Any, {
        Symbol: function (record) {return record.value},
        Mod: function (record) {return record.op.calc(undefined, record.term).getValue()},
        Expression: getExpressionValue,
        EmbeddedExpression: getExpressionValue,
        default: function (value) {
          return value
        }
      })
    },
    getBoolean () {
      var thisTerm = this
      var getExpressionBoolean = function () {return thisTerm.exec().getBoolean()}
      return this.get(Boolean, {
        Boolean: function (boolean) {return boolean},
        Expression: getExpressionBoolean,
        EmbeddedExpression: getExpressionBoolean,
        default: function () {
          throw new TypeError('Invalid term Boolean')
        }
      })
    },
    getPriority () {
      return this.force('Operator').priority
    },
    getString () {
      return this.get(String, {
        Number: function (number) {return String(number)},
        Boolean: function (boolean) {return  String(boolean)},
        String: function (str) {return  str},
        Symbol: function (record) {return  record.char},
        Mod: function (record) {return  record.term.getString() + record.char},
        Expression: function (record) {return  getTermString(record.terms, 0)},
        EmbeddedExpression: function (record) {return  '(' + getTermString(record.terms, 0) + ')'},
        Operator: function (op) {
          return op.get(String, {default: function (str) {return str}})
        }
      })
    },
    isLowPriority (termOperator) {
      return this.get(Boolean, {
        Operator: function (op) {return op.priority < termOperator.getPriority()},
        default: function () {return false}
      })
    },
    isSamePriority (termOperator) {
      return this.get(Boolean, {
        Operator: function (op) {return termOperator.getPriority() === op.priority},
        default: function () {return false}
      })
    },
    forceExpression () {
      var returnExpression = function (record) {return record}
      return this.get(Expression, {
        Expression: returnExpression,
        EmbeddedExpression: returnExpression,
      })
    },
    addBoolean (boolean) {
      return addOperand.call(this, Term.Boolean(boolean))
    },
    addString (string) {
      return addOperand.call(this, Term.String(string))
    },
    addNumber (number) {
      return addOperand.call(this, Term.Number(number))
    },
    addSymbol (symb) {
      return addOperand.call(this, Term.Symbol(symb))
    },
    addMod (mod) {
      return addOperand.call(this, Term.Mod(mod))
    },
    addExp (exp) {
      return addOperand.call(this, exp)
    },
    addOperator (operator) {
      return addTermOperator.call(this, Term.Operator(operator))
    }
  }
  })

  var Term = Enum.create('Term', [
    ['Expression', Expression],
    ['EmbeddedExpression', Expression],
    Operand,
    ['Operator', Operator],
    ['Invalid']
  ],
  [
    TermMethods
  ])
  
var Calc = Proto.class('Calc', function (global) {
  var BasicInterface = Proto.interface('BasicInterface', function (global) {
    global.extends([Operator])
    return {
      priority: 0,
      return (result) {
        return Operator.return('Number', result)
      }
    }
  })
  var Basic = Enum.create('Basic', [
    ['Add', Enum.const('+'), {
      calc (term0, term1) {
        return this.enum.return(term0.getValue() + term1.getValue())
      }      
    }],
    ['Sub', Enum.const('-'), {
      calc (term0, term1) {
        return this.enum.return(term0.getValue() - term1.getValue())
      }
    }],
    ['Multiplication', Enum.const('×'), {
      priority: 1,
      calc (term0, term1) {
        return this.enum.return(term0.getValue() * term1.getValue())
      }
    }],
    ['Division', Enum.const('÷'), {
      priority: 1,
      calc (term0, term1) {
        return this.enum.return(term0.getValue() / term1.getValue())
      }
    }]
  ],
  [
    BasicInterface
  ])
  return {
    plus: Basic.Add(),
    minus: Basic.Sub(),
    times: Basic.Multiplication(),
    divide: Basic.Division(),
    new () {
      var exp = Term.Expression(Expression.init())
      var expressions = []
      Util.fn(this, function openParenthesis () {
        expressions.push(exp)
        exp = Term.Expression(Expression.init())
        return this
      })
      Util.fn(this, function closeParenthesis () {
        var lastExp = expressions.pop()
        exp = lastExp.addExp(Term.EmbeddedExpression(exp.forceExpression()))
        return this
      })
      Util.fn(this, function result () {
        return expressions.concat(exp).reduce(function (comp, exp) {return comp.addExp(exp)}).exec().modTerm()
      })
      Util.fn(this, function equal () {
        exp = exp.makeSame(Expression.init({
          terms: Record.init({0: this.result()}),
          lastTerm: 0
        }))
        return this
      })
      Util.fn(this, function number (number) {
        exp = exp.addNumber(number)
        return this
      })
      Util.def(this, 'symbol', function addSymbol (symb) {
        exp = exp.addSymbol(Symbol.init(symb))
        return this
      })
      Util.def(this, 'mod', function addMod (mod) {
        exp = exp.addMod(Mod.init(mod))
        return this
      })
      Util.def(this, 'operator', function addOperator (operator) {
        exp = exp.addOperator(operator)
        return this
      })
      Util.fn(this, function hasOperator () {
        var record = exp.forceExpression()
        return record.lastTerm > 0
      })
      Util.fn(this, function isEmpty () {
        var record = exp.forceExpression()
        return record.terms.isEmpty()
      })
      Util.pseudo(this, 'lastTerm', {get: function () {
        var record = exp.forceExpression()
        return record.terms[record.lastTerm]
      }})
      Util.pseudo(this, 'lastOperator', {get: function () {
        var record = exp.forceExpression()
        if (!record.terms.isEmpty() && record.terms[record.lastTerm].isKindOf('Operator')) {
          return record.terms[record.lastTerm]
        }
        return record.terms[record.lastTerm / 2 - 1]
      }})
      Util.fn(this, function toString () {
        return expressions.concat(exp).reduce(function (comp, exp) {return comp.addExp(exp)}).getString()
      })
    }
  }
  })
  var PowerCalc = Enum.create('PowerCalc', [
    ['Power' , Enum.const('^'), {
      priority: 2,
      calc (term0, term1) {
        return this.enum.return('Number', term0.getValue() ** term1.getValue())
      }
    }]
  ],
  [
    Operator
  ])
  var PercentCalc = Enum.create('PercentCalc', [
    ['PercentSum', Enum.const('%'), {
      priority: 0.5,
      calc (term0, term1) {
        return this.enum.return('Number', (term0 !== undefined ? term0.getValue() : 1) * term1.getValue() / 100)
      }
    }],
    ['Percent', Enum.const('%'), {
      priority: 0.5,
      calc (term0, term1) {
        return this.enum.return('Number', term1.getValue() / 100)
      }
    }],
    ['ShadowMultiplication', Enum.const(''), {
      priority: 20,
      calc (term0, term1) {
        return this.enum.return('Number', term0.getValue() * term1.getValue())
      }
    }]
  ],
  [
    Operator
  ])
  return {
    Operator,
    Term,
    Mod,
    Expression,
    Calc,
    PercentCalc,
    PowerCalc
  }
  })