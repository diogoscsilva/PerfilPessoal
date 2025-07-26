"use strict"
Proto.module('ChessGame', function (imports) {
  var PlayerCtx = imports.ChessPlay.PlayerCtx
  var Player = imports.ChessPieces.Player
  var Tuple = imports.DataTypes.Tuple
  var Record = imports.DataTypes.Record

  var ChessGame = Proto.class('ChessGame' , function (global) {
    return {
      new: function newFn () {
        var _this = global.private(this)
        _this.board = PlayerCtx.newBoard()
        var rolesPlayer1 = PlayerCtx.makePieceRolesCreators(_this.board, false)
        var rolesPlayer2 = PlayerCtx.makePieceRolesCreators(_this.board, true)
        rolesPlayer1.player = PlayerCtx.player(Player.new(1, false))
        rolesPlayer2.player = PlayerCtx.player(Player.new(2, true))
        rolesPlayer1.board = PlayerCtx.board()
        rolesPlayer2.board = PlayerCtx.board()
        rolesPlayer1.enemy = PlayerCtx.enemy()
        rolesPlayer2.enemy = PlayerCtx.enemy()
        _this.player1ctx = PlayerCtx.new(rolesPlayer1)
        _this.player2ctx = PlayerCtx.new(rolesPlayer2)
        _this.player1ctx.board.setup()
        _this.player2ctx.board.setup()
        _this.player1ctx.enemy.setup(_this.player2ctx)
        _this.player2ctx.enemy.setup(_this.player1ctx)
        _this.turn = false
      },
      move: function move (pieceName, row, column) {
        var _this = global.private(this)
        var playerCtx = _this.turn ? _this.player2ctx : _this.player1ctx
        var move = playerCtx.player.move('ally' + pieceName, row, column)
        if (move.ok) {
          _this.turn = !_this.turn
        }
        return move
      },
      getPiece: function getPiece (pieceName, board) {
          board = board || global.private(this).board
          var enumPiece = board[pieceName]
          return enumPiece.get(Tuple, {
            default: function (piece) {
              if (!piece.captured) {
                return Tuple.init([
                  pieceName,
                  enumPiece.makeSame(piece.make({
                    moves: Record.init(piece.moves.map(function (move) {
                      return move.make({})
                    }))
                  }))
                ])
              }
              return Tuple.void
            }
          })
      },
      getPieces: function getPieces() {
        var pieces = []
        var board =  global.private(this).board
        for (var pieceName in  board) {
          if (Util.hasOwn(board, pieceName)) {
            var pieceTuple = this.getPiece(pieceName, board)
            if (!pieceTuple.isEmpty()) {
              pieces.push(pieceTuple)
            }
          }
        }
        return Tuple.init(pieces)
      },
      promoveTo: function promoveTo (pieceName, pieceType) {
        var _this = global.private(this)
        var allyCtx = _this.turn ? _this.player2ctx : _this.player1ctx
        var enemyCtx = _this.turn ? _this.player1ctx : _this.player2ctx
        var piece = this.getPiece(pieceName)[1]
        piece = PlayerCtx.newChessPiece(pieceType, piece.getColor(), piece.getPoint().row, piece.getPoint().column, piece.getMoves())
        _this.board[pieceName] = piece
        allyCtx.player.promoveTo('ally' + pieceName.replace(_this.turn ? 'black' : 'white', ''), piece)
        enemyCtx.player.promoveTo('enemy' + pieceName.replace(_this.turn ? 'black' : 'white', ''), piece)
      }
    }
  })
  return {
    ChessGame
  }
})