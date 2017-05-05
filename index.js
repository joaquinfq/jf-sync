/**
 * Finaliza la sincronización.
 *
 * @param {Function} cb        Callback a ejecutar al finalizar todas las ejecuciones.
 * @param {*}        error     Error recibido (`null` si no hay error).
 * @param {Array}    functions Resultados de las funciones ejecutadas.
 */
function end(cb, error, functions)
{
    if (error instanceof Error)
    {
        error.index = functions.$index;
    }
    delete functions.$index;
    cb(error, functions);
}
/**
 * Ejecuta la siguiente función de la lista.
 *
 * @param {Object[]} functions Listado de funciones a ejecutar.
 * @param {Function} cb        Callback a ejecutar al finalizar todas las ejecuciones.
 */
function next(functions, cb)
{
    let _fn = functions[functions.$index];
    if (_fn)
    {
        _fn.fn.call(_fn.scope, ..._fn.args, (error, data) => result(functions, cb, error, data));
    }
    else
    {
        end(cb, new TypeError('Function expected'), functions);
    }
}
/**
 * Normaliza la configuración de todas las funciones a ejecutar.
 *
 * @param {Array} functions Listado de funciones a ejecutar.
 */
function normalize(functions)
{
    functions.$index = 0;
    functions.forEach(
        (fn, index) =>
        {
            switch (typeof fn)
            {
                case 'function':
                    functions[index] = {
                        args  : [],
                        fn    : fn,
                        scope : fn
                    };
                    break;
                case 'object':
                    if (fn)
                    {
                        functions[index] = fn = Object.assign(
                            {
                                args  : fn.args || [],
                                fn    : fn.fn,
                                scope : fn.scope || fn.fn
                            },
                            fn
                        );
                        if (typeof fn.fn === 'function')
                        {
                            if (!Array.isArray(fn.args))
                            {
                                fn.args = [fn.args];
                            }
                        }
                        else
                        {
                            functions[index] = null;
                        }
                    }
                    break;
                default:
                    functions[index] = null;
                    break;
            }
        }
    );
}
/**
 * Analiza el resultado de la ejecución de una función.
 *
 * @param {Object[]} functions Listado de funciones a ejecutar.
 * @param {Function} cb        Callback a ejecutar al finalizar todas las ejecuciones.
 * @param {null|*}   error     Error recibido (`null` si no hay error).
 * @param {*}        data      Datos recibidos de la función.
 */
function result(functions, cb, error, data)
{
    if (error)
    {
        end(cb, error, functions);
    }
    else
    {
        functions[functions.$index++] = data;
        if (functions.$index < functions.length)
        {
            next(functions, cb);
        }
        else
        {
            end(cb, null, functions);
        }
    }
}
/**
 * Sincroniza la ejecución de las funciones asíncronas especificadas.
 *
 * Cada función recibirá como último parámetro el callback a llamar
 * usando el formato de NodeJS: `(error, data)`.
 *
 * El array de funciones será modificado y cada elemento será reemplazado por el
 * parámetro `data` recibido.
 *
 * @param {Function[]|Object[]} functions Funciones asíncronas a ejecutar de manera síncrona.
 * @param {Function}            cb        Callback a ejecutar al finalizar todas las ejecuciones.
 */
module.exports = function jfSync(functions, cb)
{
    if (typeof cb !== 'function')
    {
        cb = () => {};
    }
    if (typeof functions === 'function')
    {
        functions = [ functions ];
    }
    if (Array.isArray(functions))
    {
        normalize(functions);
        next(functions, cb);
    }
    else
    {
        throw new TypeError('Functions list expected');
    }
};
