'use strict';

const Route = require('route-parser');

class Resource {
    constructor(route) {
        this._route = new Route(route);
        this._methods = new Map();
    }

    get route() {
        return this.route;
    }

    match(url) {
        return this._route.match(url);
    }

    normalizeMethodName(method) {
        return method.toUpperCase();
    }

    hasHandler(method) {
        return this._methods.has(this.normalizeMethodName(method));
    }

    addHandler(method, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler should be a function');
        }

        this._methods.set(this.normalizeMethodName(method), handler);
        return this;
    }

    getHandler(method) {
        return this._methods.get(this.normalizeMethodName(method));
    }

    listMethods() {
        return [...this._methods.keys()];
    }

    get(handler) {
        this.addHandler('get', handler);
        return this;
    }

    confirm(handler) {
        this.addHandler('confirm', handler);
        return this;
    }

    post(handler) {
        this.addHandler('post', handler);
        return this;
    }

    put(handler) {
        this.addHandler('put', handler);
        return this;
    }

    delete(handler) {
        this.addHandler('delete', handler);
        return this;
    }

    patch(handler) {
        this.addHandler('patch', handler);
        return this;
    }

    options(handler) {
        this.addHandler('options', handler);
        return this;
    }

    head(handler) {
        this.addHandler('head', handler);
        return this;
    }
}

module.exports = Resource;
