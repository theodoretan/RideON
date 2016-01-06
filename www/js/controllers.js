angular.module('starter.controllers', ['ionic', 'firebase'])

.controller('LoginCtrl', function($scope, $state, $firebase, $ionicModal) {
  var firebaseRef = new Firebase("https://rideon.firebaseio.com/");

  $scope.$on("$ionicView.beforeEnter", function(event) {
    console.log('beforeEnter fire');
    // skip login if user already logged in
    if (firebaseRef.getAuth()) {
      $state.go('main');
    }
  });

  $ionicModal.fromTemplateUrl('contact-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal
  })

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.register = function() {
    $state.go('register');
  };

  $scope.login = function(user) {
    if (user && user.email && user.password) {
      firebaseRef.authWithPassword({
        'email': user.email,
        'password': user.password
      }, function(error, authData) {
        if (error) {
          console.log('Login Failed', error);
          $scope.errorMsg = error;

          $scope.modal.show();

        } else {
          console.log ('Authenticated Successfully');
          $state.go('main');
        }
      });
    } else {
      $scope.errorMsg = 'You need to fill out all fields';
      $scope.modal.show();
    }
  };
})

.controller('RegisterCtrl', function($scope, $state, $firebase, $ionicModal) {
  var firebaseRef = new Firebase('https://rideon.firebaseio.com/');

  $ionicModal.fromTemplateUrl('contact-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal
  })

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.login = function() {
    $state.go('login');
  };

  $scope.register = function(user) {
    var patt = /\d{10}/g;//new RegExp('\d{10}');

    if (user && user.email && user.password && user.name && user.phone) {
      if (!patt.test(parseInt(user.phone.replace(/-/g,'')))) {
        $scope.errorMsg = 'The phone number entered is inccorect';
        $scope.modal.show();
        console.log('phone error');
      } else {
        firebaseRef.createUser({
          email: user.email,
          password: user.password
        }, function(error, userData) {
          if (error) {
            switch (error.code) {
              case 'EMAIL_TAKEN':
                $scope.errorMsg = 'There is currently an account under this email';
                console.log('There is currently an account under this email.');
                break;
              case 'INVALID_EMAIL':
                $scope.errorMsg = 'This seems to be an invalid email...';
                console.log('This seems to be an invalid email...');
                break;
              default:
                $scope.errorMsg = error;
                console.log('Error creating user: ', error);
            }
            $scope.modal.show();
          } else {
            firebaseRef.child('users').child(userData.uid).set({
              email:user.email,
              password: user.password,
              name: user.name,
              phone: user.phone
            });

            console.log('Successfully created user with uid: ', userData.uid);
            $state.go('login');
          }
        });
      }
    } else {
      $scope.errorMsg = 'Fill out all fields';
      $scope.modal.show();
    }
  }
})

.controller('MainCtrl', function($scope, $state, $firebase, $ionicModal) {
  var firebaseRef = new Firebase('https://rideon.firebaseio.com');
  var authData = firebaseRef.getAuth();
  var uid = authData.uid;
  $scope.cards = [];

  $ionicModal.fromTemplateUrl('contact-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal
  })

  $scope.showModal = function() {
    $scope.modal.show();
  }

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });



  // set which cards are shown
  firebaseRef.child('users/'+uid).once('value', function(picture) {
    if (picture.child('driving').hasChildren() || picture.child('riding').hasChildren()) {

      picture.child('driving').forEach(function(data) {
        firebaseRef.child('rides/'+data.val().rid).once('value', function(inner_picture) {
          var obj = inner_picture.val();

          var temp = {
            from:obj.departure,
            to:obj.destination,
            date:obj.date,
            time:obj.time,
            cost:obj.cost,
            seats:obj.seats_available,
            driver: 'You',
            did: uid,
            key: inner_picture.key()
          };

          $scope.cards.push(temp);
        });
      });

      picture.child('riding').forEach(function(data) {
        firebaseRef.child('rides/'+data.val().rid).once('value', function(inner_picture) {
          var obj = inner_picture.val();

          firebaseRef.child('users/'+obj.driver).once('value', function(iip) {
            var temp = {
              from:obj.departure,
              to:obj.destination,
              date:obj.date,
              time:obj.time,
              cost:obj.cost,
              seats:obj.seats_available,
              driver:iip.val().name,
              did: iip.key(),
              key:inner_picture.key()
            };

            $scope.cards.push(temp);
          });
        })
      });

      $scope.rides = true;
    } else {
      $scope.rides = false;
    }
  });

  $scope.search = function() {
    $state.go('rider');
  };

  $scope.drive = function() {
    $state.go('driver');
  };

  $scope.logout = function() {
    firebaseRef.unauth();
    $state.go('login');
  };

  $scope.goAccount = function() {
    $state.go('account');
  };

  $scope.kill = function(data) {
    console.log(data);

    if (data.did == uid) {
      console.log('you ARE the driver');
      //delete ride

      firebaseRef.child('rides/'+data.key+'/rider').once('value', function(check) {
        //console.log(check.val());
        if (check) {
          check.forEach(function(snapshot) {
            //get ids and remove ride from users lists
            var id = snapshot.val().rid;

            firebaseRef.child('users/'+id+'/riding').once('value', function(ss) {
              ss.forEach(function(ssData) {
                if (ssData.val().rid == data.key) {
                  firebaseRef.child('users/'+id+'/riding/'+ssData.key()).remove();
                }
              });
            });
          });
        }
      });

      firebaseRef.child('rides/'+data.key).remove(function(err) {
        if (!err) {
          firebaseRef.child('users/'+uid+'/driving').once('value', function(check) {
            if (check) {
              check.forEach(function(snapshot) {
                if (snapshot.val().rid == data.key) {
                  firebaseRef.child('users/'+uid+'/driving/'+snapshot.key()).remove(function(inerr) {
                    if (!inerr) {
                      $state.go($state.current, {}, {reload: true});
                    }
                  });
                }
              });
            }
          });
        }
      });


    } else {
      console.log('you are a rider');
      // remove from seat
      firebaseRef.child('rides/'+data.key).once('value', function(snapshot) {
        var ava_seats = snapshot.val().seats_available;
        var tak_seats = snapshot.val().seats_taken;

        firebaseRef.child('rides/'+data.key).update({seats_available:++ava_seats, seats_taken:--tak_seats}, function(error) {
          if (!error) {
            firebaseRef.child('users/'+authData.uid+'/riding').once('value', function(ss) {
              ss.forEach(function (ssData) {
                if (ssData.val().rid == data.key) {
                  firebaseRef.child('users/'+authData.uid+'/riding/'+ssData.key()).remove(function(inerr) {
                    $state.go($state.current, {}, {reload: true});
                  });
                }
              });
            });
          }
        });
      });
    }
  };

})

.controller('RiderCtrl', function($scope, $state, $firebase, $ionicModal) {
  var firebaseRef = new Firebase('https://rideon.firebaseio.com/');
  var authData = firebaseRef.getAuth();
  $scope.cards = [];

  $ionicModal.fromTemplateUrl('contact-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal
  })

  $scope.closeModal = function() {
    $scope.modal.hide();

    $state.go('main');
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  firebaseRef.child('rides').once('value', function(snapshot) {
    snapshot.forEach(function(picture) {
      var obj = picture.val();

      if (obj.driver != authData.uid && obj.seats_available > 0) {
        var temp = {
          from:obj.departure,
          to:obj.destination,
          date:obj.date,
          time:obj.time,
          cost:obj.cost,
          seats:obj.seats_available,
          driver: obj.driver,
          key:picture.key()
        };

        console.log(obj);
        $scope.cards.push(temp);
        $scope.rides = true;
      }
    });
  });

  $scope.check = function(ride) {
    console.log(ride);

    firebaseRef.child('rides/'+ride.key).once('value', function(data) {
      var ava_seats = data.val().seats_available;
      var tak_seats = data.val().seats_taken;

      firebaseRef.child('rides/'+ride.key).update({seats_available:--ava_seats, seats_taken:++tak_seats}, function(error) {
        if (!error) {
          firebaseRef.child('users/'+authData.uid+'/riding').push({rid:ride.key});
        }
      });

      firebaseRef.child('rides/'+ride.key+'/rider').push({rid:authData.uid});
    })

    $scope.modal.show();
  }

  $scope.submit = function(ride) {
    console.log(ride);
  }
})

.controller('DriverCtrl', function($scope, $state, $firebase, $ionicScrollDelegate, Locations, Styles, $ionicModal) {
  var firebaseRef = new Firebase('https://rideon.firebaseio.com/');

  $scope.locations = Locations.all();
  $scope.ride = { departure: '', destination: '', date: '', time: '', cost: '' };
  $scope.hasChecked = false;
  $scope.continue = false;
  $scope.current;

  $scope.depStyle = {};
  $scope.destStyle = Styles.all();
  $scope.dateStyle = Styles.all();

  $ionicModal.fromTemplateUrl('contact-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal
  })

  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.changeLocation = function(data) {
    if ($scope.current) $scope.current.checked = false;
    data.checked = true;
    $scope.current = data;
  };

  $scope.departFunc = function() {
    for (var i = 0; i < $scope.locations.length; i++) {
      if ($scope.locations[i].checked) {
        $scope.ride.departure = $scope.locations[i].place;
        $scope.hasChecked = true;
        $scope.current = undefined;
        $scope.depStyle = Styles.all();
        $scope.destStyle = {};
        $ionicScrollDelegate.scrollTop();
      }
    }

    if (!$scope.hasChecked) {
      $scope.errorMsg = 'You must pick a Location';
      $scope.modal.show();
    }
  };

  $scope.destinationFunc = function() {
    for (var i = 0; i < $scope.locations.length; i++) {
      if ($scope.locations[i].checked && $scope.locations[i].place != $scope.ride.departure) {
        $scope.ride.destination = $scope.locations[i].place;
        $scope.continue = true;
        $scope.destStyle = Styles.all();
        $scope.dateStyle = {};
        $ionicScrollDelegate.scrollTop();
      }
    }

    if (!$scope.continue) {
      $scope.errorMsg = 'You must pick a proper location';
      $scope.modal.show();
    }
  };

  $scope.submit = function(ride) {
    var ridesRef = firebaseRef.child('rides');
    var authData = firebaseRef.getAuth();
    var uid = authData.uid;

    if (ride.cost && ride.cost > 0 && ride.date && ride.seats && ride.seats > 0 && ride.time) {
      var id = ridesRef.push({
        departure: $scope.ride.departure,
        destination: $scope.ride.destination,
        time: ride.time.toTimeString().substring(0,5),
        cost: ride.cost,
        date: ride.date.toDateString(),
        seats_available: ride.seats,
        seats_taken: 0,
        driver: uid
      });

      firebaseRef.child('users/'+uid+'/driving').push({
        rid:id.key()
      });

      $state.go('main');
    } else {
      $scope.errorMsg = 'You need to fill out all the fields properly';
      $scope.modal.show();
    }

  }
})

.controller('AccountCtrl', function($scope, $state, $ionicModal, $firebase) {

});
