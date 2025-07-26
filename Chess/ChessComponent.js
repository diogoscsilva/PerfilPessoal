Proto.module('ChessComponent', function (imports) {
    var ChessGame = imports.ChessGame.ChessGame
    var Component = imports.ReactUse.Component
    var Out = imports.ReactUse.Out
    var Modal = imports.Containers.Modal
    var Task = imports.Task.Task

    function getSrc (piece, type) {
      return (piece.color ? 'black' : 'white') + ' ' + type// + '.svg'
    }

    function getSquare (board, piece) {
      var point = piece.point
      return board[point.row][point.column]
    }

    function isPromotionMove (row, enumPiece) {
        if (row !== 0 && row !== 7) {
           return false
        }
        return enumPiece.get(Boolean, {
            PawnUp: Util.value(true),
            PawnDown: Util.value(true),
            default: Util.false
        })
    }
    function markValidMove (board, enumPiece) {
        enumPiece.match({
            default: function (piece) {
                piece.moves.forEach(function (move, path) {
                    if (!Util.isEqual(piece.point, move.start)) {
                        var point = move.start
                        var endPoint = move.end
                        while (!Util.isEqual(point, endPoint)) {
                            var moveSquare = board[point.row][point.column]
                            moveSquare.className = 'valid-square ' + moveSquare.className
                            point = point[path](1)
                        }
                        var moveSquare = board[point.row][point.column]
                        moveSquare.className = 'valid-square ' + moveSquare.className
                    }
                })
            }
        })
    }

    function clearValidMoves (board) {
        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 8; j++) {
                var square = board[i][j]
                square.className = square.className.replace('valid-square ', '')
            }
        }
    }

    function setPieceImage (square, pieceName, src) {
        var span = document.createElement('span')
        span.setAttribute('aria-label', pieceName)
        span.setAttribute('role', 'image')
        span.className = src
        square.appendChild(span)
    }

    var Promotion = Component.create('Promotion', {
      render: function render (props) {
        var use = this.use
        var onChange = props.onChange
        return use.tag('div', {className: "promotion"})
        .tag('label')
        .wrap()
          .text('Queen')
          .tag('input', {
            type: 'radio',
            name: 'promotion',
            checked: true,
            value: 'Queen',
            onChange
          })
        .end()
        .tag('label')
        .wrap()
          .text('Knight')
          .tag('input', {
            type: 'radio',
            name: 'promotion',
            value: 'Knight',
            onChange
          })
        .end()
        .tag('label')
        .wrap()
          .text('Bishop')
          .tag('input', {
            type: 'radio',
            name: 'promotion',
            value: 'Bishop',
            onChange
          })
        .end()
        .tag('label')
        .wrap()
          .text('Rook')
          .tag('input', {
            type: 'radio',
            name: 'promotion',
            value: 'Rook',
            onChange
          })
        .end()
      }
    })

    var Chess = Component.create('Chess', {
        render: function (props) {
        var use = this.use
        var game = use.value(ChessGame.new())
        var gamseSetter =  use.setter()
        props.newGame.set(function () {
          gamseSetter(ChessGame.new())
        })
        var board = []
        var play = {turn: false, origin: undefined, waitPromotion: ['']}

        function onRender (e) {

            Array.prototype.slice.call(e.target
            .getElementsByClassName('row'))
            .forEach(function (divRow, i) {
                board[i] = []
                Array.prototype.slice.call(divRow
                .getElementsByTagName('div'))
                .forEach(function (square, j) {
                    var row = i
                    var column = j
                    function onClick () {
                        setSquare(row, column, square)
                    }
                    square.addEventListener('click', onClick)
                    board[row][column] = square
                })
            })

            var pieces = game.getPieces()
            pieces.forEach(function (tuple) {
                var pieceName = tuple[0]
                var enumPiece = tuple[1]
                enumPiece.match({
                    Rook: function (piece) {
                        var square = getSquare(board, piece)
                        var src = getSrc(piece, 'rook')
                        setPieceImage(square, pieceName, src)
                    },
                    Knight: function (piece) {
                        var square = getSquare(board, piece)
                        var src = getSrc(piece, 'knight')
                        setPieceImage(square, pieceName, src)
                    },
                    Bishop: function (piece) {
                        var square = getSquare(board, piece)
                        var src = getSrc(piece, 'bishop')
                        setPieceImage(square, pieceName, src)
                    },
                    Queen: function (piece) {
                        var square = getSquare(board, piece)
                        var src = getSrc(piece, 'queen')
                        setPieceImage(square, pieceName, src)
                    },
                    King: function (piece) {
                        var square = getSquare(board, piece)
                        var src = getSrc(piece, 'king')
                        setPieceImage(square, pieceName, src)
                    },
                    default: function (piece) {
                        var square = getSquare(board, piece)
                        var src = getSrc(piece, 'pawn')
                        setPieceImage(square, pieceName, src)
                    },
                })
            })
        }

        function setSquare (row, column, square) {
            if (play.waitPromotion[0] !== '') {
              activeModal.out(true)
              return
            }
            var origin = play.origin
            if (origin) {
                if (origin === square) {
                    origin.className = origin.className.replace('mark-square ', '')
                    play.origin = undefined
                    clearValidMoves(board)
                } else {
                    var piece = origin.getElementsByTagName('span')[0]
                    var pieceName = piece.getAttribute('aria-label')
                    if (isPromotionMove(row, game.getPiece(pieceName)[1])) {
                        activeModal.out(true)
                        return Task.new(function (resolve) {
                            play.waitPromotion = [pieceName , resolve]
                        })
                        .then(function (pieceType) {
                            play.waitPromotion = ['']
                            var promoted = origin.getElementsByTagName('span')[0]
                            promoted.className = promoted.className.replace('pawn', pieceType.toLowerCase())
                            setSquare(row, column, square)
                        })
                    }
                    result = game.move(pieceName.replace(/(black|white)/, ''), row, column)
                    if (result.ok) {
                        play.turn = !play.turn
                        var captured = square.getElementsByTagName('span')[0]
                        if (captured) {
                            delete board[captured.getAttribute('aria-label')]
                            square.removeChild(captured)
                        }
                        square.appendChild(piece)
                        origin.className = origin.className.replace('mark-square ', '')
                        play.origin = undefined
                        clearValidMoves(board)
                        result.especial.match({
                            EnPassant: function () {
                                var square = board[row === 2 ? 3 : 4][column]
                                var captured = square.getElementsByTagName('span')[0]
                                square.removeChild(captured)
                            },
                            Castling: function () {
                                var squareRook = board[row][column === 6 ? 7 : 0]
                                var captured = squareRook.getElementsByTagName('span')[0]
                                var square = board[row][column === 6 ? 5 : 3]
                                square.appendChild(captured)
                            },
                            default: Util.pass
                      })
                    } else {
                        alert('Wrong move!')
                    }
                }
            } else {
                var pieceEl = square.getElementsByTagName('span')[0]
                if (pieceEl) {
                    var pieceName = pieceEl.getAttribute('aria-label')
                    if ((play.turn && /^black/.test(pieceName))
                    || (!play.turn && /^white/.test(pieceName))) {
                        play.origin = square
                        square.className = 'mark-square ' + square.className
                        var enumPiece = game.getPiece(pieceName)[1]
                        markValidMove(board, enumPiece)
                    }
                }
            }
        }
        var activeModal = Out.init()
        var rows = []
        for (var i = 0; i < 8; i++) {
            rows.push(use.tag('div', {className: 'row'}))
            for (var j = 0; j < 8; j++) {
                var className = ''
                if (i % 2 + j % 2 !== 1) {
                    className = 'dark-square'
                }
                rows[i].tag('div', {className})
            }
        }
        function promotionChange (e) {
            activeModal.out(false)
            game.promoveTo(play.waitPromotion[0], e.target.value)
            play.waitPromotion[1](e.target.value)
        }
        return use.tag('div', {id: 'board', onRender})
        .el(Modal, {modalOn: activeModal})
        .wrap()
            .el(Promotion, {onChange: promotionChange})
        .end()
        .addList(rows)
        }
    })
    
    return {
        Chess
    }
    
})