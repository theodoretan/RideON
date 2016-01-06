angular.module('starter.services', [])

.factory('Locations', function() {
  var locations = [
    { place : 'Laurier', checked : false },
    { place : 'UTSG', checked : false },
    { place : 'Western', checked : false },
    { place : 'Queens', checked : false },
    { place : 'Waterloo', checked : false },
    { place : 'McMaster', checked : false },
    { place : 'York', checked : false },
    { place : 'Brock', checked : false },
    { place : 'UOIT', checked : false },
    { place : 'UTM', checked : false },
    { place : 'UTSC', checked : false },
    { place : 'Guelph', checked : false }
  ];

  return {
    all: function() {
      return locations;
    }
  };
})

.factory('Styles', function() {
  var hidden = {display:'none', visibility:'hidden'};
  return {
    all: function() {
      return hidden;
    }
  };
});
