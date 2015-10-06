var express = require('express');
var async   = require('async');
var router  = express.Router();
var Device  = require('../models/device');
var User    = require('../models/user');
var Log     = require('../models/log');
var _       = require('underscore');

module.exports = function(){

  router.get('/', function(req, res, next) {
    res.json('You lost?');
  })
  
  .get('/push', function(req, res, next) {
    // require device_id for push
    if (!req.query.device_id){
      res.json({error: 'device_id required.'});
    } // endif
    else{
      var device_id = req.query.device_id; 
      // remove the device_id from the query object
      delete req.query.device_id;

      Device.findOne({_id: device_id}, function(err, device) {
        var  query_keys = Object.keys(req.query);
        if (device){
          var variables = device.variable.map(function(item) { return item.name; });
          // if query has valid data
          if(_.isEqual(variables.sort(), query_keys.sort())) {
            newLog = new Log({
              device_id: device._id,
              data: req.query
            });

            newLog.save(function(err, data) {
              res.json({status: 'Success'});
            });
          }
          else{
            res.json({ error: "Allowed Data: " + variables.join(', ') });
          } 
        }
        else{
          res.json({error: 'Device does not exist.'});
        }
      });
    } // end else
  })
  
  .get('/fetch/:id', function(req, res, next) {
    Device.findOne({ _id: req.params.id }, function(err, device) {
      if(device){
        var d = Log.find({'device_id' : device.id }, 'created_at data').limit(1000);
        d.exec( function(err, logs) {
          if (err) throw err;
          var series = [];
          device.variable.forEach(function(item) {
            var data = [];
            logs.forEach(function(log) {
              data.push({ x: log.created_at.getTime(), y: parseInt(log.data[item.name]) });
            });
            series.push({
              name: item.name,
              color: item.color,
              data: data
            });
          });
          res.json(series);
        });
      }
      else{
        res.json({error: "Device not found."});
      }
    });
  })
  

  // Mobile
  .get('/sign_in', function(req, res, next) {

    var email = req.query.email;
    var password = req.query.password;

    if(email === undefined || password === undefined) { res.json({error: "email / password params required."}); }
    else{
      User.findOne({email: email}, function(err, user) {
        var validPass =  user ? user.comparePassword(password) : false;
        if(user && validPass){
          res.json({success: user._id}); 
        }
        else if(user && !validPass){
          res.json({error: "Wrong password."});
        }
        else{
          res.json({error: "User does not exist."});
        }
      });
    }
  })
  
  // TODO add async loop to fix this shit
  .get('/fetch/all_devices/:id', function(req, res, next) {
    var user_id = req.params.id;
    if(user_id){
      var data = [];

      Device.find({user_id: user_id}, function(err, devices) {
        if(devices){
          var all_devices = [];
          async.each(devices,
            function(device, callback){
              var d = Log.find({'device_id' : device.id }, 'created_at data').limit(1000);
              d.exec( function(err, logs) {
                if (err) throw err;
                var series = [];
                device.variable.forEach(function(item) {
                  var data = [];
                  logs.forEach(function(log) {
                    data.push({ x: log.created_at.getTime(), y: parseInt(log.data[item.name]) });
                  });
                  series.push({
                    name: item.name,
                    color: item.color,
                    data: data
                  });
                });

                var item = {   
                  name: device.name,
                  desc: device.desc,
                  location: device.location,
                  gmap: device.gmap,
                  privacy: device.privacy,
                  variables: series
                }
 
                all_devices.push(item);
                callback();
              });


            },
            // return function
            function(err) {
              res.json(all_devices);
            }
          );

        }
        else{
          res.json({error: 'no devices found'});
        }
      });  
    }
    else{
      res.json({error: "User id required."});
    }
  })
  
  .get('/create_device', function(req, res, next) {
    var user_id  = req.query.user_id;
    var name     = req.query.name;
    var desc     = req.query.desc;
    var privacy  = req.query.privacy;
    var graph    = req.query.graph;
    var location = req.query.location;
    var variable = {name: req.query.data, color: "#CD5C5C"};
  
  })

  .get('/forget_pass', function(req, res, next) {
  
  });


  return router;
};
