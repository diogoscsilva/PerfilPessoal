
"use strict"
Proto.module('ChessPieces', function (imports) {
  var Enum = imports.DataTypes.Enum
  var Dict = imports.DataTypes.Dict
  var Tuple = imports.DataTypes.Tuple
  var Record = imports.DataTypes.Record

    var LMove = Proto.interface('LMove', function () {
      return {
        leftSouth: function leftSouth(squares) {
          return this.displace(squares * 2, squares * -1)
        },
        downEast: function downEast(squares) {
          return this.displace(squares * 1, squares * 2)
        },
        rightNorth: function rightNorth(squares) {
          return this.displace(squares * -2, squares * 1)
        },
        upWest: function upWest(squares) {
          return this.displace(squares * -1, squares * -2)
        },
        rightSouth: function rightSouth(squares) {
          return this.displace(squares * 2, squares * 1)
        },
        upEast: function upEast(squares) {
          return this.displace(squares * -1, squares * 2)
        },
        leftNorth: function leftNorth(squares) {
          return this.displace(squares * -2, squares * -1)
        },
        downWest: function downWest(squares) {
          return this.displace(squares * 1, squares * -2)
        }
      }
    })
  
    var Displace = Proto.interface('Displace', function (global) {
      global.extends([LMove])
      return {
        south: function southeast(squares) {
          return this.displace(squares, 0)
        },
        east: function east(squares) {
          return this.displace(0, squares)
        },
        north: function southeast(squares) {
          return this.displace(-1 * squares, 0)
        },
        west: function west(squares) {
          return this.displace(0, -1 * squares)
        },
        southEast: function southeast(squares) {
          return this.displace(squares, squares)
        },
        northEast: function southeast(squares) {
          return this.displace(-1 * squares, squares)
        },
        northWest: function southeast(squares) {
          return this.displace(-1 * squares, -1 * squares)
        },
        southWest: function southeast(squares) {
          return this.displace(squares, -1 * squares)
        }
      }
    })


  var Point = Record.create('Point', {
    row: 8,
    column: 8
  },
  {
    displace: function (row, column) {
      return Point.new(this.row + row, this.column + column)
    },
    displaceRow: function displaceRow (squares) {
      return Point.new(this.row + squares, this.column)
    },
    displaceColumn: function displaceColumn (squares) {
      return Point.new(this.row, this.column + squares)
    }
  },[
    Displace
  ])
  
  var Especial = Enum.create('Especial', [
    ['EnPassant'],
    ['Castling'],
    ['Check'],
    ['Checkmate'],
    ['No']
  ])

  var Interval = Record.create('Interval', {
    start: 8,
    end: 8
  },
  {
    get size () {
      return Math.abs(this.start - this.end)
    }
  })

  var Move = Dict.create('Move', {
    h: Dict.const(Interval.init()),
    v: Dict.const(Interval.init()),
    barrier: '',
    threats: Tuple.boxOf(String),
    capture: false,
    especial: Especial.No()
  },
  {
    interval: function interval (start, end) {
      return Interval.new(start, end !== undefined ? end : start)
    },
    createMove: function createMove (move, startPoint, endPoint) {
      if (!Util.hasOwn(move, 'v')) {
        move.v = Move.interval(startPoint.row, endPoint && endPoint.row)
      }
      if (!Util.hasOwn(move, 'h')) {
        move.h = Move.interval(startPoint.column, endPoint && endPoint.column)
      }
      return Move.init(move)
    },
    createMoves: function createMoves (movesObj, startPoint, endPoint) {
      return Record.init(Record.map.call(movesObj, function (move) {
        return Move.createMove(move, startPoint, endPoint)
      }))
    },
    includes: function includes (point) {
      return (this.v.start === this.v.end && point.row === this.v.end
      && ((this.h.start <= point.column && point.column <= this.h.end)
      || (this.h.end <= point.column && point.column <= this.h.start)))

      || ((this.h.start === this.h.end && point.column === this.h.end

      || (this.startSum === this.endSum
      && this.endSum === point.row + point.column)

      || (this.startSub === this.endSub
      && this.endSub === point.row - point.column))

      && ((this.v.start <= point.row && point.row <= this.v.end)
      || (this.v.end <= point.row && point.row <= this.v.start)))
    },
    get start () {
      return Point.new(this.v.start, this.h.start)
    },
    get end () {
      return Point.new(this.v.end, this.h.end)
    },
    get startSum () {
      return this.v.start + this.h.start
    },
    get endSum () {
      return this.v.end + this.h.end
    },
    get startSub () {
      return this.v.start - this.h.start
    },
    get endSub () {
      return this.v.end - this.h.end
    },
    getPointByRow (row) {
      if (this.v.start === this.v.end) {
        return this.end
      }
      var intersection = this.end
      if (this.h.start === this.h.end) {
        intersection = Point.new(row, this.h.end)
      } else if (this.startSum === this.endSum) {
        var intersection = Point.new(row, this.endSum - row)
      } else if (this.startSub === this.endSub) {
        var intersection = Point.new(row, row - this.endSub)
      }
      return this.includes(intersection)
      ? intersection : this.end
    },
    getPointByCol (col) {
      if (this.h.start === this.h.end) {
        return this.end
      }
      var intersection = this.end
      if (this.v.start === this.v.end) {
        intersection = Point.new(this.v.end, col)
      } else if (this.startSum === this.endSum) {
        var intersection = Point.new(this.endSum - col, col)
      } else if (this.startSub === this.endSub) {
        var intersection = Point.new(col + this.endSub, col )
      }
      return this.includes(intersection)
      ? intersection : this.end
    },
    getPointBySum (sum) {
      if (this.startSum === this.endSum) {
        return this.end
      }
      var intersection = Point.new(this.v.end, this.h.end)
      if (this.v.start === this.v.end) {
        intersection = Point.new(this.v.end, sum - this.v.end)
      } else if (this.h.start === this.h.end) {
        intersection = Point.new(sum - this.h.end, this.h.end)
      } else if (this.startSub === this.endSub) {
        var sub = this.endSub
        if ((sum + sub) % 2 === 0) {
          var row = (sum + sub) / 2
          var column = (sum - sub) / 2
          var intersection = Point.new(row, column)
        }
      }
      return this.includes(intersection)
      ? intersection : this.end
    },
    getPointBySub (sub) {
      if (this.startSub === this.endSub) {
        return this.end
      }
      var intersection = this.end
      if (this.v.start === this.v.end) {
        intersection = Point.new(this.v.end, this.v.end - sub)
      } else if (this.h.start === this.h.end) {
        intersection = Point.new(this.h.end + sub, this.h.end)
      } else if (this.startSum === this.endSum) {
        var sum = this.endSum
        if ((sum + sub) % 2 === 0) {
          var row = (sum + sub) / 2
          var column = (sum - sub) / 2
          var intersection = Point.new(row, column)
        }
      }
      return this.includes(intersection)
      ? intersection : this.end
    },
    hasIntersectionWith: function hasIntersectionWith (move) {
      return this.intersectionWith(move) && true || false
    },
    intersectionWith: function intersectionWith (move) {
      var intersection = Point.new(8, 8)
      if (this.v.start === this.v.end) {
        intersection = move.getPointByRow(this.v.end)
      } else if (this.h.start === this.h.end) {
        intersection = move.getPointByCol(this.h.end)
      } else if (this.startSum === this.endSum) {
        intersection = move.getPointBySum(this.endSum)
      } else if (this.startSub === this.endSub) {
        intersection = move.getPointBySub(this.endSub)
      }
      return this.includes(intersection) && intersection
    },
    hasContinuityWith: function hasContinuityWith (move) {
      if (this.v.start === move.v.start || this.h.start === move.h.start
      || this.startSum === move.startSum || this.startSub === move.startSub) {
        return this.joinsWith(move)
      }
    },
    joinsWith: function joinsWith (move) {
      return Math.abs(this.v.end - move.v.end) <=1
      && Math.abs(this.h.end - move.h.end) <=1
    },
    getCapture: function getCapture (point) {
      if (this.v.end === point.row && this.h.end === point.column) {
        return this.barrier
      }
      return ''
    }
  })

  var PieceProperties = Proto.interface('PiecesProperties', function (global) {
    function getProperty (self, Type, propName) {
      return self.get(Type, {
        default: function (piece) {
          return piece[propName]
        }
      })
    }
    function setProperty (self, propName, value) {
      self.match({
        default: function (piece) {
          piece[propName] = value
        }
      })
    }
    return {
      touch: function touch () {
        setProperty(this, 'untouch', false)
      },
      getColor: function getColor () {
        return getProperty(this, Boolean, 'color')
      },
      getMoves: function getMoves () {
        return getProperty(this, Record, 'moves')
      },
      getPoint: function getPoint () {
        return getProperty(this, Point, 'point')
      },
      setPoint: function setPoint (point) {
        setProperty(this, 'point', point)
      },
      setMoves: function setMoves (movesObj) {
        setProperty(this, 'moves', Record.init(movesObj))
      },
      updateMoves: function updateMoves (movesObj) {
        this.match({
          default: function (piece) {
            piece.moves = Record.init(piece.moves.assign(movesObj))
          }
        })
      },
      untouch: function untouch () {
        return getProperty(this, Boolean, 'untouch')
      },
      setCaptured: function setCaptured () {
        setProperty(this, 'captured', true)
      }
    }
  })

  var Piece = Dict.create('Piece', {
    point: Point.new(8, 8),
    color: Dict.const(false),
    untouch: true,
    moves: Record.boxOf(Move),
    captured: false
  })

  var ChessPiece = Enum.create('ChessPiece', [
    ['PawnUp', Piece],
    ['PawnDown', Piece],
    ['Rook', Piece],
    ['Knight', Piece],
    ['Bishop', Piece],
    ['Queen', Piece],
    ['King', Piece]
  ],
  [
    PieceProperties
  ])

  var Player = Proto.class('Player', function () {
    return {
      new: function newFn(id, black) {
        Util.final(this, 'id', id)
        Util.final(this, 'color', black)
      }
    }
  })

  return {
    ChessPiece,
    Piece,
    Move,
    Especial,
    Point,
    Player
  }
})