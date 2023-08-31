'use strict';

const RouteParser = require('route-parser');
const Resource = require('./resource.js');

module.exports = createRouter;

function createRouter(fn) {
    var before = [];
    var after = [];
    var routes = {};
    var resources = new Map();

    function matchResources(req, res) {
        const url = req.url;
        const method = req.method;

        for(let resource of resources.values()) {
            let match = resource.match(url);
            if (match) {
                if (! resource.hasHandler(method)) {
                    res.statusCode = 405;
                    res.statusText = 'Method not allowed';
                    res.setHeader('allow', resource.listMethods().join(','));
                    res.end();
                    return;
                }

                req.params = match;

                return [...before, resource.getHandler(method), ...after];
            }
        }
    }

    function matchMethods(req) {
        var url = req.url;
        if (! routes.hasOwnProperty(req.method) || ! routes[req.method].length) {
            return;
        }

        var methodRoutes = routes[req.method];
        var i = -1;
        var len = methodRoutes.length;
        var route, match;

        while (++i < len) {
            route = methodRoutes[i];
            match = route.parser.match(url);

            if (match) {
                req.params = match;
                return [...before, route.fn, ...after];
            }
        }
    }

    var router = function(req, res, next_){
        var next;
        if (arguments.length === 2) {
            next = router.defaultNext(req, res);
        }
        else {
            next = next_;
        }

        var queue;

        queue = matchResources(req, res);

        if (! queue) {
            if (res.finished) {
                return;
            }

            queue = matchMethods(req, res);

            if (! queue) {
                next();
                return;
            }
        }

        function loop(err) {
            var route;

            if (queue.length) {
                do {
                    route = queue.shift();
                    try {
                        if (err) {
                            if (route.length > 3) {
                                route(err, req, res, loop);
                                return;
                            }
                        } else {
                            if (route.length < 4) {
                                route(req, res, loop);
                                return;
                            }
                        }
                    } catch (caught) {
                        next(caught);
                        return;
                    }

                } while(queue.length);
            }

            next(err);
        }

        loop.skip = function(err){
            queue.length = 0;
            loop(err);
        };


        loop();
    };

    var methods = [
        'GET',
        'POST',
        'DELETE',
        'PUT',
        'PATCH',
        'HEAD',
        'OPTIONS',
        'CONFIRM',
    ];

    methods.forEach(function(method){
        routes[method] = [];
        router[method.toLowerCase()] = function (route, fn) {
            var parser = route instanceof RouteParser
                ? route
                : new RouteParser(route);

            routes[method].push({
                parser: parser,
                fn: fn
            });

            return this;
        };
    });

    router.all = function(route, fn) {
        var parser = route instanceof RouteParser
            ? route
            : new RouteParser(route);

        methods.forEach(function(method){
            routes[method].push({
                parser: parser,
                fn: fn
            });
        });

        return this;
    };

    router.filter = function(fn) {
        before.push(function(req, res, next){
            var result = fn(req, next, next.skip);
            if (typeof result === 'boolean') {
                if (result) {
                    next();
                } else {
                    next.skip();
                }
            } else if (result && result instanceof Promise) {
                result.then(next.bind(null, null), next.skip);
            }
        });
        return this;
    };

    router.before = function(fn) {
        before = before.concat(
            Array.prototype.slice.call(arguments)
        );

        return this;
    };

    router.after = function(fn) {
        after = after.concat(
            Array.prototype.slice.call(arguments)
        );

        return this;
    };

    router.use = function(fn){
        if (routes.length) {
            this.after.apply(this, arguments);
        } else {
            this.before.apply(this, arguments);
        }

        return this;
    };

    router.resource = function(route, handlers) {
        let route_ = normalizeRoute(route);
        let resource;
        if (resources.has(route_)) {
            resource = resources.get(route_);
        }
        else {
            resource = new Resource(route_);
            resources.set(route_, resource);
        }

        if (handlers) {
            Object.getOwnPropertyNames(handlers)
            .forEach(function(method){
                resource.addHandler(method, handlers[method]);
            });
        }


        return resource;
    }

    router.defaultNext = createRouter.defaultNext;

    if (typeof fn === 'function') {
        fn(router);
    }

    return router;
}

/**
 * Final middleware factory. Calling when no request found.
 *
 * @param  {http.ServerRequest} req Http request instance.
 * @param  {http.ServerResponse} res Http response instance.
 * @return {function(Error)}
 */
function defaultNext(req, res) {
    return function(err) {
        if (err) {
            res.status = 500;
            res.end(err.stack);
        } else {
            res.status = 400;
            res.end(req.url + ' not found.');
        }
    };
}

/**
 * Normalize route. Replace trailing slash from the end of route. Replace
 * duplicated slashes, etc.
 *
 * @param  {string} route Route string
 * @return {string}       Normalized route string.
 */
function normalizeRoute(route) {
    route = route.replace(/\/+$/, '');
    route = route.replace(/^\/+/, '/');

    return route;
}


createRouter.defaultNext = defaultNext;
createRouter.RouteParser = RouteParser;
createRouter.Resource = Resource;
