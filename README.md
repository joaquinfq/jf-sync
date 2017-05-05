# jf-sync [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

[![npm install jf-sync](https://nodei.co/npm/jf-sync.png?mini=true)](https://npmjs.org/package/jf-sync/)

Synchronize asynchronous functions.

## Usage

You need to pass two parameters to `jfSync`:

- Functions list. This list can be specified using two formats:
  - Functions: each item is a function.
  - Object: each item is an object with keys:
    - fn   : Function to execute (mandatory).
    - args : Arguments to pass to function (default: `[]`).
    - scope: Scope of function execution (default: `fn`).
- Callback: Callback to execute at end of run. The signature is `(error, data)`.

As NodeJS callbacks, each function will receive a callback function as last parameter.
The function will be responsible of calling this callback when finish.
 
The functions list WILL BE modified and each item WILL BE replaced with result of
function execution received in `data` parameter of callback.

## Examples

### No errors.

Next, an example using 2 functions and 1 method. We will simulate asynchronous
execution using a timer.

```js
const jfSync = require('jf-sync');

function a(cb)
{
    setTimeout(
        () => cb(null, 'a'),
        Math.random() * 100
    );
}
function b(param, cb)
{
    setTimeout(
        () => cb(null, param),
        Math.random() * 100
    );
}
class C
{
    method(param1, param2, cb)
    {
        setTimeout(
            () => cb(null, param1, param2),
            Math.random() * 100
        );
    }
}

const c = new C();

jfSync(
    [
        a,
        {
            fn   : b,
            args : 'Test'
        },
        {
            fn   : c.method,
            scope: c,
            args : [
                'Param 1',
                'Param 2'
            ]
        },
    ],
    (error, data) => console.log(error, data) // null [ 'a', 'Test', [ 'Param 1', 'Param 2' ] ]
);
```

As you can see, we can execute methods in class instances using `scope` key.

### With errors.

When an error occurs and `error` is an instance of `Error` you can check in
`error.index` the index of failed function.

You can retrieve results of previous functions in `data` parameters
iterating from index `0` to `error.index` or using `data.slice(0, error.index)`.

Remember, `error` MUST BE an instance of `Error` if you want to retrieve previous
values using `error.index`.

```js
const jfSync = require('jf-sync');

function a(cb)
{
    cb(null, 'a');
}
function b(cb)
{
    cb(new Error('Error found'));
}
function c(cb)
{
    cb(null, 'Never executed');
}

jfSync(
    [ a, b, c ],
    (error, data) => console.log(error.index, data.slice(0, error.index)) // 1 [ 'a' ]
);
```

### Nested jfSync

Next, a more complicated example: a decorator system.

Each decorator will modify an object using two methods:

- `before`: Executed before calling object method.
- `after` : Executed after calling object method.

Each decoration process can be asynchronous, so values added to decorated object 
can be read from DB, web, etc., and call `cb(error, data)` in right moment.

```js
const jfSync = require('jf-sync');
//------------------------------------------------------------------------------
// Decorator classes.
//------------------------------------------------------------------------------
class DecoratorBase
{
    // This method must be abstract and implemented in child class
    after(obj, cb)
    {
        const _name = this.constructor.name;
        obj.after.push(_name);
        cb(null, [this.constructor.name, 'after']);
    }

    // This method must be abstract and implemented in child class
    before(obj, cb)
    {
        const _name = this.constructor.name;
        obj.before.push(_name);
        cb(null, [this.constructor.name, 'before']);
    }
}
class DecoratorOne extends DecoratorBase {}
class DecoratorTwo extends DecoratorBase {}
//------------------------------------------------------------------------------
// Class to decorate.
//------------------------------------------------------------------------------
class NeedDecoration
{
    constructor()
    {
        this.after  = [];
        this.before = [];
    }

    method(cb)
    {
        cb(null, 'NeedDecoration: between after and before');
    }
}
//------------------------------------------------------------------------------
// Add a new decorator to list.
//------------------------------------------------------------------------------
function addDecorator(Decorator, obj)
{
    const _decorator = new Decorator();
    after.push(
        {
            args  : obj,
            fn    : _decorator.after,
            scope : _decorator
        }
    );
    before.push(
        {
            args  : obj,
            fn    : _decorator.before,
            scope : _decorator
        }
    );
}
//------------------------------------------------------------------------------
// Decorate object.
//------------------------------------------------------------------------------
// Object to decorate.
const decorated = new NeedDecoration();
// Functions to call after decoration.
const after  = [];
// Functions to call before decoration.
const before = [];
// Add all decorators required.
addDecorator(DecoratorOne, decorated);
addDecorator(DecoratorTwo, decorated);
// Sync decoration process.
jfSync(
    [
        cb => jfSync(before, cb),
        cb => jfSync(
            [
                {
                    fn    : decorated.method,
                    scope : decorated
                }
            ],
            cb
        ),
        cb => jfSync(after, cb)
    ],
    (error, data) =>
    {
        console.log('ERROR: ', error);
        console.log('DATA : ', data);
        console.log('OBJ  : ', decorated);
    }
);
```
Output after script execution:

```
ERROR:  null
DATA :  [
    [
        [ 'DecoratorOne', 'before' ],
        [ 'DecoratorTwo', 'before' ]
    ],
    [
        'NeedDecoration: between after and before' 
    ],
    [
        [ 'DecoratorOne', 'after' ],
        [ 'DecoratorTwo', 'after' ]
    ]
]
OBJ  :  NeedDecoration {
  after  : [ 'DecoratorOne', 'DecoratorTwo' ],
  before : [ 'DecoratorOne', 'DecoratorTwo' ]
}
```

As you can see, each decorator was executed in a synchronous way and
modified object in expected order.

Remember, `data` will have results of each method executed instead of
original functions.

You can use this example and change some parts for testing errors.
