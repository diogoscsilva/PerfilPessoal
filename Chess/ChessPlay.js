"use strict"
Proto.module('ChessPlay', function (imports) {
    var DCI = imports.DCI.DCI
    var DCIContext = imports.DCI.DCIContext
    var Point = imports.ChessPieces.Point
    var Move = imports.ChessPieces.Move
    var Player = imports.ChessPieces.Player
    var ChessPiece = imports.ChessPieces.ChessPiece
    var Especial = imports.ChessPieces.Especial
    var Piece = imports.ChessPieces.Piece
    var Record = imports.DataTypes.Record
    var Dict = imports.DataTypes.Dict
    var Tuple = imports.DataTypes.Tuple
  
    var PiecePath = Proto.interface('PiecePath', function () {
      return {
        explorer: function explorer (point, path) {
          var board = this.ctx.board
          var furtherPoint = point
          var nextPoint = point[path](1)
          var startPoint = nextPoint
          var roleName = board.get(nextPoint)
          if (!this.knightMove.includes(path)) {
            while (roleName === '') {
              furtherPoint = nextPoint
              nextPoint = furtherPoint[path](1)
              roleName = board.get(nextPoint)
            }
          }
          if (roleName !== undefined || furtherPoint !== point) {
            return {
              start: startPoint,
              end: roleName === undefined ? furtherPoint : nextPoint,
              targetName: roleName || ''
            }
          }
          return {}
        },
        searchPiecesRoles: function searchPiecesRoles (point, list) {
          var piecesRoles = {}
          for (var i = 0; i < list.length; i++) {
            var pathName = list[i]
            var targetObj = this.explorer(point, pathName)
            if (targetObj.targetName) {
              piecesRoles[pathName] = targetObj.targetName
            }
          }
          return piecesRoles
        },
        searchPaths: function searchPaths (point, list) {
          var moves = {}
          for (var i = 0; i < list.length; i++) {
            var pathName = list[i]
            var move = this.searchPath(point, pathName)
            if (!move.isEmpty()) {
              moves[pathName] = move
            }
          }
          return moves
        },
        searchPath: function searchPath (point, pathName) {
          var targetObj = this.explorer(point, pathName)
          var endPoint = targetObj.end
          var targetName = targetObj.targetName
          if (endPoint) {
            var startPoint = targetObj.start
            var moveObj = {
              v: Move.interval(startPoint.row, endPoint.row),
              h: Move.interval(startPoint.column, endPoint.column)
            }
            if (targetName) {
              moveObj.barrier = targetName
              var targetPiece = this.ctx[targetName]
              if (targetPiece.isAlly()) {
                endPoint = endPoint[pathName](-1)
                if (Util.isEqual(point, endPoint)) {
                  startPoint = point
                }
                moveObj.v = Move.interval(startPoint.row, endPoint.row),
                moveObj.h = Move.interval(startPoint.column, endPoint.column)
              } else {
                moveObj.capture = true
              }
            }
            return Move.init(moveObj)
          }
          return Move.void
        },
        isInvalidPawnCapture: function isInvalidPawnMove (move, pathName) {
          return !move.isEmpty()
          && (!move.capture || move.v.size > 0)
        },
        pawnCapture: function pawnCapture (point, pathName) {
          var move = this.searchPath(point, pathName)
          if (this.isInvalidPawnCapture(move, pathName)) {
            return Move.void
          }
          return move
        },
        pawnCaptures: function pawnCaptures (point, moves, capturePaths) {
          for (var pathName in moves) {
            if (Util.hasOwn(moves, pathName)
            && capturePaths.includes(pathName)) {
              var move = moves[pathName]
              if (this.isInvalidPawnCapture(move, pathName)) {
                delete moves[pathName]
              }
            }
          }
          return moves
        },
        shrinkMoves: function shrinkMoves (moves, squares) {
          squares = squares || 1
          for (var pathName in moves) {
            var move = moves[pathName]
            moves[pathName] = this.shrinkMove(move, pathName, squares)
          }
          return moves
        },
        shrinkMove: function shrinkMove (move, pathName, squares) {
          squares = squares || 1
          var size = move.v.size || move.h.size
          if (size > squares - 1) {
            var diplacePoint = Point.new(move.v.start, move.h.start)[pathName](squares - 1)
            return Move.init({
              v: Move.interval(move.v.start, diplacePoint.row),
              h: Move.interval(move.h.start, diplacePoint.column),
              barrier: move.barrier
            })
          }
          return move
        },
        straight: Tuple.init([
          'north',
          'west',
          'south',
          'east'
        ]),
        knightMove: Tuple.init([
          'rightNorth',
          'upWest',
          'leftSouth',
          'downEast',
          'leftNorth',
          'downWest',
          'rightSouth',
          'upEast'
        ]),
        diagnoally: Tuple.init([
          'northWest',
          'southWest',
          'southEast',
          'northEast'
        ]),
        downMethods: Tuple.init([
          'southWest',
          'south',
          'southEast'
        ]),
        upMethods:Tuple.init([
          'northWest',
          'north',
          'northEast'
        ]),
        opposed: Record.init({ 
          south: 'north',
          east: 'west',
          north: 'south',
          west: 'east',
          southEast: 'northWest',
          northEast: 'southWest',
          northWest: 'southEast',
          southWest: 'northEast',
          leftSouth: 'rightNorth',
          downEast:'upWest',
          rightNorth: 'leftSouth',
          upWest: 'downEast',
          rightSouth: 'leftNorth',
          upEast: 'downWest',
          leftNorth: 'rightSouth',
          downWest: 'upEast'
        }),
      }
    })
    var PiecesMoves = Proto.interface('PiecesMoves', function () {

      function resetKingThreats (self) {
        var king = self.ctx.allyKing
        var kingPoint = king.point
        for (var roleName in self.ctx) {
          var pieceRole = self.ctx[roleName]
          if (Util.hasOwn(self.ctx, roleName)
          && Proto.interfaceof(pieceRole, PieceRole)
          && !pieceRole.isAlly()) {
            king.changeMoves(function (threatenedMove, threatenedPath) {
              if (!threatenedMove.includes(kingPoint)) {
                var newMoves = this
                pieceRole.changeThreatsMoves(function (pieceMove) {
                  if (threatenedMove.hasIntersectionWith(pieceMove)
                  && (threatenedMove.barrier !== roleName || !threatenedMove.capture)) {
                    newMoves[threatenedPath] = Move.createMove({
                      threats: threatenedMove.threats.assign([roleName])
                    }, kingPoint)
                  }
                })
              }
            })
          }
        }
      }
      function pieceThreat (board) {
        var king = board.ctx.allyKing
        king.forEachMove(function (kingMove, kingPath) {
          var barrierRoleName = kingMove.barrier
          var barrierRole = board.ctx[barrierRoleName]
          if (barrierRole && barrierRole.isAlly()) {
            var barrierPoint = barrierRole.point
            var continuityMove = board.searchPath(barrierPoint, kingPath)
            var threatRoleName = continuityMove.barrier
            var threatRole = board.ctx[threatRoleName]
            if (threatRole && !threatRole.isAlly() && !threatRole.isPawn()) {
              var threatMove = threatRole.getMove(board.opposed[kingPath])
              if (threatMove && Util.isEqual(threatMove.end, barrierPoint)) {
                barrierRole.changeMoves(function (move, path) {
                  if (move.barrier !== threatRoleName || !move.capture) {
                    this[path] = Move.createMove({threats: Tuple.init([threatRoleName, 'allyKing'])}, barrierPoint)
                  }
                })
              }
            }
          }
        })
      }
     function castling (self) {
        var king = self.ctx.allyKing
        if (king.untouch) {
            var rooks = {
            west: 'allyRook0',
            east: 'allyRook7'
          }
          var kingDirections = ['east', 'west']
          var rookDirections = ['west', 'east']
          for (var i = 0; i < 2; i++) {
            var direction = kingDirections[i]
            king.changeMoves(function (move, pathName) {
              if (pathName === direction && move.barrier === rooks[direction]) {
                var rook = self.ctx[rooks[direction]]
                if (rook.untouch) {
                  var threats = rook.canBlockMove(rook.getMove(rookDirections[i]), true).map(function (threat) {
                    return threat.pieceName
                  })
                  if (threats.length === 0) {
                    this[direction] =  move.make({
                      h: Move.interval(move.h.start, direction === 'east'
                      ? 6 : 2),
                      especial: Especial.Castling()
                    })
                  } else {
                    this[direction] = move.make({
                      h: Move.interval(move.h.start, direction === 'east'
                      ? 5 : 3),
                      threats: Tuple.init(threats),
                      especial: Especial.No()
                    })
                  }
                }
              }
            })
          }
        }
      }
      function clearPieceThreats (pieceRole, threatName) {
        pieceRole.changeMoves(function (move, path) {
          if (move.threats.length > 0) {
            var threats = move.threats.filter(function (item) {
              return item !== 'check' && item !== threatName
            })
            if (move.threats.length !== threats.length) {
              if (threats.length === 0 || (threats.length === 1
              && (threatName === 'allyKing' || threats[0] === 'allyKing'))) {
                this[path] = pieceRole.findMove(path)
              } else {
                this[path] = move.make({
                  threats: Tuple.init(threats)
                })
              }
            }
          }
        })
      }
      function getAllPieces (self, point) {
        var moves = Record.init(self.searchPiecesRoles(point, self.straight))
        .assign(self.searchPiecesRoles(point, self.knightMove))
        return Record.init(moves).assign(self.searchPiecesRoles(point, self.diagnoally))
      }
      return {
        resetThreats: function resetThreats () {
          resetKingThreats(this)
          pieceThreat(this)
          castling(this)
        },
        clearThreats: function clearThreats (threatName) {
          for (var roleName in this.ctx) {
            var pieceRole = this.ctx[roleName]
            if (Util.hasOwn(this.ctx, roleName)
            && Proto.interfaceof(pieceRole, PieceRole)
            && pieceRole.isAlly()) {
              clearPieceThreats(pieceRole, threatName)
            }
          }
        },
        checkThreats: function checkThreats (outMoves) {
          for (var roleName in this.ctx) {
            var pieceRole = this.ctx[roleName]
            if (Util.hasOwn(this.ctx, roleName)
            && Proto.interfaceof(pieceRole, PieceRole)
            && pieceRole.isAlly()) {
              var piecePoint = pieceRole.point
              if (Util.hasOwn(outMoves, roleName)) {
                pieceRole.changeMoves(function (move, path) {
                  if (!Util.hasOwn(outMoves[roleName], path)) {
                    this[path] = Move.createMove({
                      barrier: move.barrier,
                      threats: move.threats.assign(['check'])
                    }, piecePoint)
                  } else {
                    var blockPoint = outMoves[roleName][path]
                    var capture = Util.isEqual(blockPoint, piecePoint) ? move.capture : false
                    this[path] = Move.createMove({
                      barrier: move.barrier,
                      capture,
                    }, blockPoint)
                  }
                })
              } else {
                pieceRole.changeMoves(function (move, path) {
                  this[path] = Move.createMove({
                    barrier: move.barrier,
                    threats: move.threats.assign(['check'])
                  }, piecePoint)
                })
              }
            }
          }
        },
        resetMoves: function resetMoves (startPoint, endPoint) {
          var pieces = getAllPieces(this, startPoint)
          var moved = this.get(endPoint)
          var result = {check: undefined}
          var newMoves = {}
          for (var pathName in pieces) {
            var piece = this.ctx[pieces[pathName]]
            if (Util.hasOwn(pieces, pathName) && piece.isAlly()) {
              var opposedPath = this.opposed[pathName]
              var opposedMove = piece.getMove(opposedPath)
              if (opposedMove) {
                if (opposedMove.barrier === moved) {
                  var newMove = piece.findMove(opposedPath)
                  if (!newMove.isEmpty()) {
                    piece.setMove(opposedPath, newMove)
                    newMoves[opposedPath] = newMove
                  } else {
                    piece.delMove(opposedPath)
                  }
                }
              }
              clearPieceThreats(piece, moved)
            }
          }
          for (var opposedPath in newMoves) {
            var newMove = newMoves[opposedPath]
            if (Util.hasOwn(newMoves, opposedPath)
            && newMove.barrier === 'enemyKing'
            && newMove.capture) {
              if (this.ctx.player.isTurn()) {
                var piecePoint = piece.point
                result.check = newMove.make({
                  v: Move.interval(piecePoint.row, newMove.v.end),
                  h: Move.interval(piecePoint.column, newMove.h.end)
                })
                break
              } else {
                throw new RangeError('Moviment not allowed.')
              }
            }
          }
          return result
        },
        resetBlocks: function resetBlocks (point) {
          var pieces = getAllPieces(this, point)
          for (var pathName in pieces) {
            if (Util.hasOwn(pieces, pathName)) {
              var roleName = pieces[pathName]
              var piece = this.ctx[roleName]
              if (piece.isAlly()) {
                var opposedPath = this.opposed[pathName]
                var opposedMove = piece.findMove(opposedPath)
                if (!opposedMove.isEmpty()) {
                  if (roleName === 'allyKing') {
                    var kingMove = piece.getMove(opposedPath)
                    if (kingMove.barrier !== '') {
                      var barrierPiece = this.ctx[kingMove.barrier]
                      if (barrierPiece && barrierPiece.isAlly()) {
                        barrierPiece.changeMoves(function (barrierMove, barrierPath) {
                          if (barrierMove.threats.includes('allyKing')) {
                            this[barrierPath] = barrierPiece.findMove(barrierPath)
                          }
                        })
                      }
                    }
                  }
                  piece.setMove(opposedPath, opposedMove)
                } else {
                  piece.delMove(opposedPath)
                }
              }
            }
          }
        }
      }
    })
    var PieceRole = Proto.interface('PieceRole', Util.noAction)
    var PlayerCtx = DCI.ctx('PlayerCtx', {
      board: DCI.role('Board', function (global) {
        global.implements([PiecePath, PiecesMoves])
        return {
          setup: function setup () {
            var _this = global.private(this)
            if (!Util.hasOwn(_this, 'board')) {
              _this.board = []
              for(var i = 0; i < 8; i++) {
                var list = []
                for (var j = 0; j < 8; j++) {
                  list[j] = ''
                }
                _this.board[i] = list
              }
              for (var roleName in this.ctx) {
                var rolePiece = this.ctx[roleName]
                if (Util.hasOwn(this.ctx, roleName)
                && Proto.interfaceof(rolePiece, PieceRole)) {
                  var point = rolePiece.point
                  _this.board[point.row][point.column] = roleName
                }
              }
            }
          },
          get: function getFn (point) {
            var board = global.private(this).board
            if (point.row >= 0 && point.row <= 7) {
              return board[point.row][point.column]
            }
          },
          move: function move (source, destiny) {
            var board = global.private(this).board
            board[destiny.row][destiny.column] = board[source.row][source.column]
            board[source.row][source.column] = ''
          },
          remove: function remove (point) {
            var board = global.private(this).board
            board[point.row][point.column] = ''
          }
        }
      }),
      player: DCI.for(Player).role('Player', function (global) {
        function removeEnPassant (self) {
          var enPassantArray = global.private(self).enPassantArray || []
          while (enPassantArray.length > 0) {
            var pawn = enPassantArray.pop()
            pawn.removeEnPassant()
          }
        }
        return {
          move: function (pieceName, endRow, endColumn) {
            var peakedPiece = this.ctx[pieceName]
            if (peakedPiece.isAlly()) {
              var _this = global.private(this)
              _this.turn = true
              var endPoint = Point.new(endRow, endColumn)
              var result = peakedPiece.makeMove(pieceName, endPoint)
              if (result.ok) {
                _this.turn = false
                removeEnPassant(this)
              }
              return result
            }
          },
          isAlly: function isAlly (color) {
            return color === global.private(this).player.color
          },
          isTurn: function isTurn () {
            return global.private(this).turn
          },
          promoveTo: function promoveTo (roleName, chessPiece) {
            this.ctx.removeRole(roleName)
            var rolePieceCreator = this.ctx.piece(chessPiece)
            this.ctx.setRole(roleName, rolePieceCreator(this.ctx, roleName))
          },
          setEnPassant: function setEnPassant (piece) {
            var _this = global.private(this)
            _this.enPassantArray = _this.enPassantArray ||  []
            _this.enPassantArray.push(piece)
          }
        }
      }),
      enemy: DCI.for(DCIContext).role('Enemy', function (global) {
        return {
          setup: function setup (playerCtx) {
            var _this = global.private(this)
            if (!Util.hasOwn(_this, 'settted')) {
              _this.dCIContext = playerCtx
              _this.setted = true
            }
          },
          resetMoves: function resetMoves (startPoint, endPoint) {
            var _this = global.private(this)
            var enemyBoard = _this.dCIContext.board
            return enemyBoard.resetMoves(startPoint, endPoint)
          },
          resetBlocks: function resetBlocks (point) {
            var _this = global.private(this)
            var enemyBoard = _this.dCIContext.board
            enemyBoard.resetBlocks(point)
          },
          resetThreats: function resetThreats () {
            var _this = global.private(this)
            var enemyBoard = _this.dCIContext.board
            enemyBoard.resetThreats()
          },
          remove: function (removedPoint) {
            var _this = global.private(this)
            var enemyBoard = _this.dCIContext.board
            var removed = enemyBoard.get(removedPoint)
            enemyBoard.remove(removedPoint)
            _this.dCIContext.removeRole(removed)
          },
          move: function (source, destiny) {
            var _this = global.private(this)
            var board = _this.dCIContext.board
            board.move(source, destiny)
          },
          isCheckmate: function isCheckmate (movesWithCheck) {
            var _this = global.private(this)
            var board = _this.dCIContext.board
            if (movesWithCheck.length === 0) {
              return false
            } 
            var king = _this.dCIContext.allyKing
            var outMoves = {}
            var checkMate = true
            king.forEachMove(function (kingMove, pathName) {
              if (!Util.isEqual(kingMove.end, king.point)) {
                checkMate = false
                outMoves.allyKing = outMoves.allyKing || {}
                outMoves.allyKing[pathName] = kingMove.end
              }
            })
            for (var i = 0; i < movesWithCheck.length; i++) {
              var move = movesWithCheck[i]
              var threats = king.canBlockMove(move)
              for (var j = 0; j < threats.length; j++) {
                checkMate = false
                var pieceName = threats[j].pieceName
                var pathName = threats[j].pathName
                var intersection = threats[j].point
                outMoves[pieceName] = outMoves[pieceName] || {}
                outMoves[pieceName][pathName] = intersection 
              }
            }
            board.checkThreats(outMoves)
            return checkMate
          },
          enPassant: function enPassant (startPoint, endPoint) {
            var _this = global.private(this)
            var board = _this.dCIContext.board
            var piece = _this.dCIContext[board.get(endPoint)]
            if (((startPoint.row === 6 && endPoint.row === 4)
            || (startPoint.row === 1 && endPoint.row === 3))) {
              var displaces = [-1, 1]
              for (var i = 0; i < 2; i++) {
                var displace = displaces[i]
               var opponentPoint = Point.new(endPoint.row, endPoint.column + displace)
                var opponent = _this.dCIContext[board.get(opponentPoint)]
                if (opponent) {
                  opponent.setEnPassant(Point.new((startPoint.row + endPoint.row) / 2, endPoint.column))
                  _this.dCIContext.player.setEnPassant(opponent)
                }
              }
            }
          }

        }
      }),
      piece: DCI.for(ChessPiece).role('Piece', function (global) {
        global.implements([PieceRole])

        function movePiece (self, roleName, endPoint, move) {
          if (move) {
            var chessPiece = global.private(self).chessPiece
            var movesWithCheck = []
            var startPoint  = self.point
            var board = self.ctx.board
            var enemy = self.ctx.enemy
            if (move.capture && Util.isEqual(move.end, endPoint)) {
              var removed = move.barrier
              board.clearThreats(removed)
              var removedPiece = self.ctx[removed]
              var removedPoint = removedPiece.point
              global.private(removedPiece).chessPiece.setCaptured()
              self.ctx.removeRole(removed)
              board.remove(removedPoint)
              enemy.remove(removedPoint)
            }
            board.clearThreats(roleName)
            board.move(startPoint, endPoint)
            chessPiece.setPoint(endPoint)
            enemy.move(startPoint, endPoint)
            chessPiece.touch()
            var resultReset = board.resetMoves(startPoint, endPoint)
            enemy.resetMoves(startPoint, endPoint)
            var result = {ok: true, check: false, checkmate: false, especial: move.especial}
            if (resultReset.check) {
              movesWithCheck.push(resultReset.check)
            }
            chessPiece.setMoves(self.findMoves())
            board.resetBlocks(endPoint)
            enemy.resetBlocks(endPoint)
            board.resetThreats()
            enemy.resetThreats()
            enemy.enPassant(startPoint, endPoint)
            var check = self.makeCheck()
            if (check) {
              movesWithCheck.push(check)
            }
            if (movesWithCheck.length > 0) {
              if (enemy.isCheckmate(movesWithCheck)) {
                result.checkmate = true
              } else {
                result.check = true
              }
            }
            return result
          }
          return {ok: false, check: false, checkmate: false, especial: Especial.No()}
        }
        function pawnMove (board, piece, pathName) {
          var move = board.searchPath(piece.point, pathName)
          if (move.capture) {
            var pointEnd = move.end[pathName](-1)
            move = move.make({
              v: move.v.size === 0 ? Move.interval(pointEnd.row)
              : Move.interval(move.v.start, pointEnd.row),
              capture: false
            })
          }
          return board.shrinkMove(move, pathName, piece.untouch ? 2 : 1)
        }
        function pawnThreats (self, piece, vertical, diagnoally) {
          var newMoves = {}
          var board = self.ctx.board
          if (Util.hasOwn(piece.moves, vertical)
          && !piece.moves[vertical].includes(piece.point)) {
            newMoves[vertical] = Move.createMove({}, piece.point)
          }
          diagnoally.forEach(function (path) {
            if (!Util.hasOwn(piece.moves, path)) {
              var threatPoint = piece.point[path](1)
              var threatSquare = board.get(threatPoint)
              if (threatSquare === '') {
                newMoves[path] = Move.createMove({}, threatPoint)
              }
            }
          })
          return Record.init(piece.moves.assign(newMoves))
        }
        function getThreatsMoves (self) {
          var chessPiece = global.private(self).chessPiece
          return chessPiece.get(Record.boxOf(Move), {
            PawnUp: function (piece) {
              return pawnThreats(self, piece, 'north', ['northWest', 'northEast'])
            },
            PawnDown: function (piece) {
              return pawnThreats(self, piece, 'south', ['southWest', 'southEast'])
            },
            default: function (piece) {
              return piece.moves
            }
          })
        }
        function changeEachMove (self, callback, moves) {
          var _this = global.private(self)
          var newMoves = {}
          moves.forEach(callback, newMoves)
          _this.chessPiece.updateMoves(newMoves)
        }
        
        return {
          isAlly: function isAlly () {
            var _this = global.private(this)
            if (!Util.hasOwn(_this, 'ally')) {
              _this.ally = this.ctx.player.isAlly(_this.chessPiece.getColor())
            }
            return _this.ally
          },
          get point () {
            var _this = global.private(this)
            return _this.chessPiece.getPoint()
          },
          setMove: function setMove (path, move) {
            var _this = global.private(this)
            _this.chessPiece.updateMoves({[path]: move})
          },
          getMove: function getMove (path) {
            var _this = global.private(this)
            return _this.chessPiece.getMoves()[path]
          },
          delMove: function delMove (removedPath) {
            var _this = global.private(this)
            var moves = _this.chessPiece.getMoves()
            var newMoves = moves.filter(function (move, path) {
              return path !== removedPath
            })
            _this.chessPiece.setMoves(newMoves)
          },
          changeMoves: function changeMoves (callback) {
            var _this = global.private(this)
            var moves = _this.chessPiece.getMoves()
            moves.forEach(callback)
            changeEachMove(this, callback, moves)
          },
          forEachMove: function forEachMove (callback) {
            var _this = global.private(this)
            var moves = _this.chessPiece.getMoves()
            moves.forEach(callback)
          },
          hasSomeThreat: function hasSomeThreat (threat) {
            var _this = global.private(this)
            var moves = _this.chessPiece.getMoves()
            return moves.some(function (move) {
              return move.threats.includes(threat)
            })
          },
          changeThreatsMoves: function changeThreatsMoves (callback) {
            var moves = getThreatsMoves(this)
            changeEachMove(this, callback, moves)
          },
          isPawn: function () {
            return global.private(this).chessPiece.get(Boolean, {
              PawnUp: Util.value(true),
              PawnDown: Util.value(true),
              default: Util.false
            })
          },
          get untouch () {
            var _this = global.private(this)
            return _this.chessPiece.untouch()
          },
          removeEnPassant: function removeEnPassant () {
            var chessPiece = global.private(this).chessPiece
            chessPiece.match({
              default: function (piece) {
                piece.moves = Record.init(piece.moves.filter(function (move) {
                  return !move.especial.isKindOf('EnPassant')
                }))
              }
            })
          },
          setEnPassant: function setEnPassant (point) {
            var chessPiece = global.private(this).chessPiece
            var piece, path
            if (chessPiece.isKindOf('PawnUp')) {
              piece = chessPiece.force('PawnUp')
              if (point.column > piece.point.column) {
                path = 'northEast'
              } else {
                path = 'northWest'
              }
            } else if (chessPiece.isKindOf('PawnDown')) {
              piece = chessPiece.force('PawnDown')
              if (point.column > piece.point.column) {
                path = 'southEast'
              } else {
                path = 'southWest'
              }
            }
            if (path !== undefined) {
              piece.moves = piece.moves.assign({
                [path]: Move.createMove({
                  capture: true,
                  barrier: 'enemyPawn' + point.column,
                  especial: Especial.EnPassant()
                }, point)
              })
              return this
            }
          },
          makeMove: function makeMove (roleName, endPoint) {
            var move = this.checkMove(endPoint)
            if (move && (move.v.end === 0 || move.v.end === 7)
            && this.isPawn()) {
              return {ok: false}
            }
            var result = movePiece(this, roleName, endPoint, move)
            if (result.ok) {
              if (roleName === 'allyKing' && move.h.size === 1) {
                var rookPoint = Point.new(move.v.end, move.h.start > move.h.end ? 0 : 7)
                var rookName = this.ctx.board.get(rookPoint)
                var rook = this.ctx[rookName]
                var rookEndPoint =  Point.new(rookPoint.row, Math.abs(rookPoint.column - 3))
                var rookMove = Move.createMove({
                  especial: Especial.Castling()
                }, rookPoint, rookEndPoint)
                return movePiece(rook, rookName, rookEndPoint, rookMove)
              }
            }
            return result
          },
          checkMove: function checkMove (endPoint) {
            var _this = global.private(this)
            var moves = _this.chessPiece.getMoves()
            var pathName = moves.findKey(function (move) {
              return move.includes(endPoint)
            })
            return moves[pathName]
          },
          makeCheck: function () {
            var move = this.getMoveBlockedBy('enemyKing')
            if (move) {
              var point = this.point
              return global.private(this).chessPiece.get(Move, {
                Knight: function () {
                  return move.make({
                    v: Move.interval(point.row),
                    h: Move.interval(point.column)
                  })
                },
                default: function () {
                  return move.make({
                    v: Move.interval(point.row, move.v.end),
                    h: Move.interval(point.column, move.h.end)
                  })
                }
              })
            }
            return move
          },
          canBlockMove: function canBlockMove (move, threat) {
            threat = threat || false
            var threats = []
            for (var pieceName in this.ctx) {
              var piece = this.ctx[pieceName]
              if (Util.hasOwn(this.ctx, pieceName)
              && Proto.interfaceof(piece, PieceRole)
              && piece !== this && piece.isAlly() !== threat) {
                var moves = global.private(piece).chessPiece.getMoves()
                for (var pathName in moves) {
                  if (Util.hasOwn(moves, pathName)) {
                    var point = moves[pathName].intersectionWith(move)
                    if (point) {
                      threats.push({pieceName, pathName, point})
                    }
                  }
                }
              }
            }
            return threats
          },
          getMoveBlockedBy: function getMoveBlockedBy (roleName) {
            var _this = global.private(this)
            var moves = _this.chessPiece.getMoves()
            var ctx = this.ctx
            var pathName = moves.findKey(function (move) {
              return move.barrier === roleName
              && move.includes(ctx[roleName].point)
            })
            return moves[pathName]
          },
          findMoves: function findMoves () {
            var thisPieceEnum = global.private(this).chessPiece
            var board = this.ctx.board
            return thisPieceEnum.get(Record.boxOf(Move), {
              Rook: function (piece) {
                return Record.init(board.searchPaths(piece.point, board.straight))
              },
              Knight: function (piece) {
                return Record.init(board.searchPaths(piece.point, board.knightMove))
              },
              Bishop: function (piece) {
                return Record.init(board.searchPaths(piece.point, board.diagnoally))
              },
              Queen: function (piece) {
                var moves = Record.init(board.searchPaths(piece.point, board.straight))
                return moves.assign(board.searchPaths(piece.point, board.diagnoally))
              },
              King: function (piece) {
                var moves = board.searchPaths(piece.point, board.straight)
                return Record.init(board.shrinkMoves(moves))
                .assign(board.shrinkMoves(board.searchPaths(piece.point, board.diagnoally)))
              },
              PawnDown: function (piece) {
                var moves = board.searchPaths(piece.point, board.downMethods)
                var capturePaths = ['southWest', 'southEast']
                moves = board.pawnCaptures(piece.point, moves, capturePaths)
                moves.south = pawnMove(board, piece, 'south')
                return Record.init(moves)
              },
              PawnUp: function (piece) {
                var moves = board.searchPaths(piece.point, board.upMethods)
                var capturePaths = ['northWest', 'northEast']
                moves = board.pawnCaptures(piece.point, moves, capturePaths)
                moves.north = pawnMove(board, piece, 'north')
                return Record.init(moves)
              }
            })
          },
          findMove: function findMove (pathName) {
            var thisPieceEnum = global.private(this).chessPiece
            var board = this.ctx.board
            return thisPieceEnum.get(Move, {
              Knight: function (piece) {
                if (!board.knightMove.includes(pathName)) {
                  return Move.void
                }
                return board.searchPath(piece.point, pathName)
              },
              King: function (piece) {
                if (board.knightMove.includes(pathName)) {
                  return Move.void
                }
                return board.shrinkMove(board.searchPath(piece.point, pathName), pathName)
              },
              Queen: function (piece) {
                if (board.knightMove.includes(pathName)) {
                  return Move.void
                }
                return board.searchPath(piece.point, pathName)
              },
              Rook: function (piece) {
                if (!board.straight.includes(pathName)) {
                  return Move.void
                }
                return board.searchPath(piece.point, pathName)
              },
              Bishop: function (piece) {
                if (!board.diagnoally.includes(pathName)) {
                  return Move.void
                }
                return board.searchPath(piece.point, pathName)
              },
              PawnDown: function (piece) {
                if (!board.downMethods.includes(pathName)) {
                  return Move.void
                }
                if (pathName === 'south') {
                  return pawnMove(board, piece, pathName)
                }
                return board.pawnCapture(piece.point, pathName)
              },
              PawnUp: function (piece) {
                if (!board.upMethods.includes(pathName)) {
                  return Move.void
                }
                if (pathName === 'north') {
                  return pawnMove(board, piece, pathName)
                }
                return board.pawnCapture(piece.point, pathName)
              }
            })
          }
        }
      })
    },
      {
        newBoard: function newBoard() {
          var board = {
            blackPawn0: this.BlackPawn(1, 0,{
              south: {v: Move.interval(2, 3), h: Move.interval(0), barrier: 'enemyPawn0'}
            }),
            blackPawn1: this.BlackPawn(1, 1, {
              south: {v: Move.interval(2, 3), h: Move.interval(1), barrier: 'enemyPawn1'}
            }),
            blackPawn2: this.BlackPawn(1, 2, {
              south: {v: Move.interval(2, 3), h: Move.interval(2), barrier: 'enemyPawn2'}
            }),
            blackPawn3: this.BlackPawn(1, 3, {
              south: {v: Move.interval(2, 3), h: Move.interval(3), barrier: 'enemyPawn3'}
            }),
            blackPawn4: this.BlackPawn(1, 4, {
              south: {v: Move.interval(2, 3), h: Move.interval(4), barrier: 'enemyPawn4'}
            }),
            blackPawn5: this.BlackPawn(1, 5, {
              south: {v: Move.interval(2, 3), h: Move.interval(5), barrier: 'enemyPawn5'}
            }),
            blackPawn6: this.BlackPawn(1, 6, {
              south: {v: Move.interval(2, 3), h: Move.interval(6), barrier: 'enemyPawn6'}
            }),
            blackPawn7: this.BlackPawn(1, 7, {
              south: {v: Move.interval(2, 3), h: Move.interval(7), barrier: 'enemyPawn7'}
            }),
            blackRook0: this.BlackRook(0, 0, {
              south: {barrier: 'allyPawn0'},
              east: {barrier: 'allyKnight1'}
            }),
            blackKnight1: this.BlackKnight(0, 1, {
              leftSouth: {v: Move.interval(2), h: Move.interval(0)},
              rightSouth: {v: Move.interval(2), h: Move.interval(2)},
              downEast: {barrier: 'allyPawn3'}
            }),
            blackBishop2: this.BlackBishop(0, 2, {
              southWest: {barrier: 'allyPawn1'},
              southEast: {barrier: 'allyPawn3'}
            }),
            blackQueen: this.BlackQueen(0, 3, {
              southWest: {barrier: 'allyPawn2'},
              west: {barrier: 'allyBishop2'},
              south: {barrier: 'allyPawn3'},
              east: {barrier: 'allykKing'},
              southEast: {barrier: 'allyPawn4'}
            }),
            blackKing: this.BlackKing(0, 4, {
              southWest: {barrier: 'allyPawn3'},
              west: {barrier: 'allyQueen'},
              south: {barrier: 'allyPawn4'},
              east: {barrier: 'allyBishop5'},
              southEast: {barrier: 'allyPawn5'}
            }),
            blackBishop5: this.BlackBishop(0, 5, {
              southWest: {barrier: 'allyPawn4'},
              southEast: {barrier: 'allyPawn6'}
            }),
            blackKnight6: this.BlackKnight(0, 6, {
              leftSouth: {v: Move.interval(2), h: Move.interval(5)},
              rightSouth: {v: Move.interval(2), h: Move.interval(7)},
              downWest: {barrier: 'allyPawn4'}
            }),
            blackRook7: this.BlackRook(0, 7, {
              south: {barrier: 'allyPawn7'},
              west: {barrier: 'allyKnight6'}
            }),
  
            whitePawn0: this.WhitePawn(6, 0, {
              north: {v: Move.interval(5, 4), h: Move.interval(0), barrier: 'enemyPawn0'}
            }),
            whitePawn1: this.WhitePawn(6, 1, {
              north: {v: Move.interval(5, 4), h: Move.interval(1), barrier: 'enemyPawn1'}
            }),
            whitePawn2: this.WhitePawn(6, 2, {
              north: {v: Move.interval(5, 4), h: Move.interval(2), barrier: 'enemyPawn2'}
            }),
            whitePawn3: this.WhitePawn(6, 3, {
              north: {v: Move.interval(5, 4), h: Move.interval(3), barrier: 'enemyPawn3'}
            }),
            whitePawn4: this.WhitePawn(6, 4, {
              north: {v: Move.interval(5, 4), h: Move.interval(4), barrier: 'enemyPawn4'}
            }),
            whitePawn5: this.WhitePawn(6, 5, {
              north: {v: Move.interval(5, 4), h: Move.interval(5), barrier: 'enemyPawn5'}
            }),
            whitePawn6: this.WhitePawn(6, 6, {
              north: {v: Move.interval(5, 4), h: Move.interval(6), barrier: 'enemyPawn6'}
            }),
            whitePawn7: this.WhitePawn(6, 7, {
              north: {v: Move.interval(5, 4), h: Move.interval(7), barrier: 'enemyPawn7'}
            }),
            whiteRook0: this.WhiteRook(7, 0, {
              north: {barrier: 'allyPawn0'},
              east: {barrier: 'allyKnight1'}
            }),
            whiteKnight1: this.WhiteKnight(7, 1, {
              leftNorth: {v: Move.interval(5), h: Move.interval(0)},
              rightNorth: {v: Move.interval(5), h: Move.interval(2)},
              upEast: {barrier: 'allyPawn3'}
            }),
            whiteBishop2: this.WhiteBishop(7, 2, {
              northWest: {barrier: 'allyPawn1'},
              northEast: {barrier: 'allyPawn3'}
            }),
            whiteQueen: this.WhiteQueen(7, 3, {
              northWest: {barrier: 'allyPawn2'},
              west: {barrier: 'allyBishop2'},
              north: {barrier: 'allyPawn3'},
              east: {barrier: 'allyKing'},
              northEast: {barrier: 'allyPawn4'}
            }),
            whiteKing: this.WhiteKing(7, 4, {
              northWest: {barrier: 'allyPawn3'},
              west: {barrier: 'allyQueen'},
              north: {barrier: 'allyPawn4'},
              east: {barrier: 'allyBishop5'},
              northEast: {barrier: 'allyPawn5'}
            }),
            whiteBishop5: this.WhiteBishop(7, 5, {
              northWest: {barrier: 'allyPawn4'},
              northEast: {barrier: 'allyPawn6'}
            }),
            whiteKnight6: this.WhiteKnight(7, 6, {
              leftNorth: {v: Move.interval(5), h: Move.interval(5)},
              rightNorth: {v: Move.interval(5), h: Move.interval(7)},
              upWest: {barrier: 'allyPawn4'}
            }),
            whiteRook7: this.WhiteRook(7, 7, {
              north: {barrier: 'allyPawn7'},
              west: {barrier: 'allyKnight6'}
            })
          }
          return Dict.init(board)
        },
        teamNameFn: function teamNameFn (color) {
          var allyName =  color ? 'black' : 'white'
          var enemyName =  !color ? 'black' : 'white'
          return function teamName (name) {
            var roleName = name.replace(allyName, 'ally')
            roleName = roleName.replace(enemyName, 'enemy')
            return roleName
          }
        },
        makePieceRolesCreators: function newPeace (board, color) {
          var thisCtx = this
          var obj = {}
          var teamName = this.teamNameFn(color)
          board.forEach(function (chessPiece, pieceName) {
            var roleName = teamName(pieceName)
            var rolePieceCreator = thisCtx.piece(chessPiece)
            obj[roleName] = rolePieceCreator
          })
          return obj
        },
        newChessPiece: function newChessPiece (name, color, row, column, moves) {
          var point =  Point.new(row, column)
          return ChessPiece[name](Piece.init({
            point,
            color: color,
            moves: Move.createMoves(moves, point)
          }))
        },
        WhitePawn: function WhitePawn (row, column, moves) {
          return this.newChessPiece('PawnUp', false, row, column, moves)
        },
        WhiteRook: function WhiteRook (row, column, moves) {
          return this.newChessPiece('Rook', false, row, column, moves)
        },
        WhiteKnight: function WhiteKnight (row, column, moves) {
          return this.newChessPiece('Knight', false, row, column, moves)
        },
        WhiteBishop: function WhiteBishop (row, column, moves) {
          return this.newChessPiece('Bishop', false, row, column, moves)
        },
        WhiteQueen: function WhiteQueen (row, column, moves) {
          return this.newChessPiece('Queen', false, row, column, moves)
        },
        WhiteKing: function WhiteKing (row, column, moves) {
          return this.newChessPiece('King', false, row, column, moves)
        },
        BlackRook: function BlackRook (row, column, moves) {
          return this.newChessPiece('Rook', true, row, column, moves)
        },
        BlackKnight: function BlackKnight (row, column, moves) {
          return this.newChessPiece('Knight', true, row, column, moves)
        },
        BlackBishop: function BlackBishop (row, column, moves) {
          return this.newChessPiece('Bishop', true, row, column, moves)
        },
        BlackQueen: function BlackQueen (row, column, moves) {
          return this.newChessPiece('Queen', true, row, column, moves)
        },
        BlackKing: function BlackKing (row, column, moves) {
          return this.newChessPiece('King', true, row, column, moves)
        },
        BlackPawn: function BlackPawn (row, column, moves) {
          return this.newChessPiece('PawnDown', true, row, column, moves)
        },
      })
      return {
        PlayerCtx
      }
  })