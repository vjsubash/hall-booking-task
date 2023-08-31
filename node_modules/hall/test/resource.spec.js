'use strict';

const {Resource} = require('..');
const should = require('should');

describe('Resource', function() {
    it('Should match routes', function() {
        var resource = new Resource('/users/:id');

        var match = resource.match('/users/1');

        should(match).have.property('id', '1');
    });

    it('#hasHandler should return `true` when handler is defined', function() {
        var resource = new Resource('/users/:id');

        resource.get(function(req, res, next) {});

        should(resource.hasHandler('get')).be.equal(true);
    });

    it('#hasHandler should return `false` when handler is not defined', function() {
        var resource = new Resource('/users/:id');

        should(resource.hasHandler('post')).be.equal(false);
    });

    it('Should list handlers', function() {
        var resource = new Resource('/users/:id');

        resource.get(function(req, res, next) {});
        resource.post(function(req, res, next) {});

        should(resource.listMethods()).be.deepEqual(['GET', 'POST']);
    });

});
