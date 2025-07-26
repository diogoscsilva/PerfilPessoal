Proto.module('App', function (imports) {

  var Component = imports.ReactUse.Component
  var Out = imports.ReactUse.Out
  var Calculator = imports.Calculator.Calculator
  var Chess = imports.ChessComponent.Chess

  var App = Component.create('App',  {
    render () {
      var newGame = Out.init()
      return this.use.tag('div')
        .tag('input', {
          className: "button-flat",
          type: 'button',
          value: 'New Game',
          onClick: function () {
            newGame.out()
          } 
        })
        .el(Chess, {newGame})
        .el(Calculator)
      .end()
    }
  })
  return {
    App
  }
})

Proto.executeModule(function (imports) {
  var App = imports.App.App
  var ReactDom = imports.ReactUse.ReactDom
  ReactDom.new(App, document.getElementById('root'))
})
