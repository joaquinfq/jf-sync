const assert = require('assert');
const jfSync = require('./index');
// Clase usada para verificar el paso de objetos como funciones.
class J
{
    method(data, cb)
    {
        setTimeout(
            () => cb(null, data),
            Math.random() * 100
        );
    }
}
function checkData(expected)
{
    return (error, data) =>
    {
        assert.strictEqual(error, null);
        assert.deepStrictEqual(data, expected);
    }
}
function checkError(expected)
{
    return (error, data) =>
    {
        assert.ok(error instanceof TypeError);
        assert.strictEqual(error.message, 'Function expected');
        assert.deepStrictEqual(data, expected);
    }
}
function testIndex()
{
    jfSync(
        [
            cb => cb(null, 'a'),
            cb => cb(null, 'b'),
            cb => cb(new Error('Error found')),
            cb => cb('Never executed')
        ],
        (error, data) => {
            assert.ok(error instanceof Error);
            assert.strictEqual(error.message, 'Error found');
            assert.strictEqual(error.index, 2);
            assert.deepStrictEqual(data.slice(0, error.index), [ 'a', 'b' ]);
        }
    );
}
/**
 * Verifica el paso de funciones.
 */
function testFunctions()
{
    let _count   = 100;
    const _getFn = () =>
    {
        const _n = _count++;
        return (cb) => setTimeout(
            () => cb(null, _n),
            Math.random() * 50
        );
    };
    jfSync(
        [
            _getFn(),
            _getFn(),
            _getFn(),
            _getFn(),
            _getFn()
        ],
        (error, data) => checkData([100, 101, 102, 103, 104])
    );
}
/**
 * Verifica que se lance un error si no se puede obtener una función en algún elemento
 * de la lista de funciones.
 */
function testNoFunctions()
{
    const _fn = function (cb)
    {
        cb(null, 1);
    };
    jfSync([], checkError([]));
    jfSync([_fn, false], checkError([1, null]));
    jfSync([1], checkError([null]));
}
/**
 * Verifica que si se mezclan funciones y objetos no hayan problemas.
 */
function testMix()
{
    let _count = 0;
    const _fn  = function (cb)
    {
        cb(null, _count++);
    };
    jfSync(
        [{fn : _fn}, _fn],
        (error, data) => checkData([0, 1])
    );
}
/**
 * Verifica el paso de objetos.
 */
function testObjects()
{
    let _count    = 200;
    const _getObj = () =>
    {
        const j = new J();
        return {
            args  : _count++,
            fn    : j.method,
            scope : j
        };
    };
    jfSync(
        [
            _getObj(),
            _getObj(),
            _getObj(),
            _getObj(),
            _getObj()
        ],
        (error, data) => checkData([200, 201, 202, 203, 204])
    );
}
//------------------------------------------------------------------------------
// Pruebas
//------------------------------------------------------------------------------
testFunctions();
testIndex();
testMix();
testNoFunctions();
testObjects();
