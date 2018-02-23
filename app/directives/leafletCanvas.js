var Leaflet = require('leaflet');

angular.module('saveourair.directives.leafletCanvas', [])
.directive('leafletCanvas', ['$timeout', function($timeout) {
  return {
    restrict: 'E',
    templateUrl: './directives/leaflet.html',
    scope: {
      data: '=',
      places: '='
    },
    link: function($scope, el, attrs) {
      $scope.$watch('data', redraw)
      
      var canvas, pos

      function redraw(){
        // Reposition the map

        var data = $scope.data.filter(function(d) {
          return d.x && d.y;
        });

        // Finding boundaries
        var minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;

        data.forEach(function(d) {
          if (d.x < minX)
            minX = d.x;
          if (d.x > maxX)
            maxX = d.x;

          if (d.y < minY)
            minY = d.y;
          if (d.y > maxY)
            maxY = d.y;
        });

        $scope.map.fitBounds([
          [minY, minX],
          [maxY, maxX]
        ]);

        // Canvas
        $timeout(redrawCanvas)
      }

      var div = el.find('div')[0];

      // Filtering irrelevant points
      var data = $scope.data.filter(function(d) {
        return d.x && d.y;
      });

      // Finding boundaries
      var minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;

      data.forEach(function(d) {
        if (d.x < minX)
          minX = d.x;
        if (d.x > maxX)
          maxX = d.x;

        if (d.y < minY)
          minY = d.y;
        if (d.y > maxY)
          maxY = d.y;
      });

      // Custom canvas layer
      Leaflet.CanvasLayer = Leaflet.Layer.extend({
        onAdd: function(map) {
          var pane = map.getPane(this.options.pane);
          canvas = Leaflet.DomUtil.create('canvas');
          var mapSize = map.getSize();

          var pixelRatio = 4;

          canvas.width = mapSize.x * pixelRatio;
          canvas.height = mapSize.y * pixelRatio;

          canvas.style.width = mapSize.x + 'px';
          canvas.style.height = mapSize.y + 'px';

          pane.appendChild(canvas);

          pos = function(point) {
            var result = map.latLngToLayerPoint([point.y, point.x]);
            result.x *= pixelRatio
            result.y *= pixelRatio
            return result
          };

          redrawCanvas()
        }
      });

      // Map initialization
      $scope.map = Leaflet.map(div, {
        center: [56.056695, 9.841720],
        zoomSnap: 0.8,
        attributionControl: false,
        zoomControl: false,
        dragging: false,
        boxZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false
      });

      Leaflet.tileLayer('http://tile.stamen.com/toner/{z}/{x}/{y}.png', {
        attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo($scope.map);

      var canvasLayer = new Leaflet.CanvasLayer();
      canvasLayer.addTo($scope.map);
    
      $scope.map.fitBounds([
        [minY, minX],
        [maxY, maxX]
      ]);

      function redrawCanvas() {

        var data = $scope.data.filter(function(d) {
          return d.x && d.y;
        });

        var ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.lineCap="round"

        var lastPosition
        var timeForATurn = 5*60*1000 // Five minutes
        var jitter
        var randomDeviation = 0
        var randomDeviation2 = 0
        var pen = {x:undefined, y:undefined}

        data.forEach(function(d, i){

          var d_canvas = pos(d)

          // Update random deviation
          randomDeviation  = 0.9 * randomDeviation  + (Math.random() - 0.5)
          randomDeviation2 = 0.9 * randomDeviation2 + (Math.random() - 0.5)

          // Rotation jitter
          var angle = (2*Math.PI*d.timestamp/300000)%(2*Math.PI) // One turn every 5 minutes
          jitter = 5 * Math.pow(d.timestatic/timeForATurn, .65) * Math.sin(2.9 * d.timestatic/timeForATurn + 0.1 * randomDeviation) // Pixels

          d_canvas.x += jitter * Math.cos(angle) + 0.2 * randomDeviation
          d_canvas.y += jitter * Math.sin(angle) + 0.2 * randomDeviation2

          if (d.def && lastPosition) {
            // Opacity: smoothe out when close to the time boundaries
            var opacity = Math.min(Math.min(Math.abs(data[0].timestamp - d.timestamp), Math.abs(data[data.length-1].timestamp - d.timestamp)) / timeForATurn, 1)
            opacity = Math.round(opacity * 1000)/1000

            // Pen
            var inertia = Math.max(0, 0.95 - 0.1 * d.timestatic/timeForATurn)
            pen.x = inertia * (pen.x || d_canvas.x) + (1-inertia) * d_canvas.x
            pen.y = inertia * (pen.y || d_canvas.y) + (1-inertia) * d_canvas.y

            // Draw
            ctx.beginPath()
            ctx.lineWidth = 4 - Math.min(3, d.smoothedspeed / 15)
            ctx.moveTo(lastPosition.x, lastPosition.y)
            ctx.lineTo(pen.x, pen.y)
            ctx.strokeStyle = 'rgba(0, 0, 0, ' + opacity + ')'
            ctx.stroke()
            ctx.fill()

          }

          lastPosition = {x:pen.x, y:pen.y}

        })

        // Draw places
        ctx.lineCap="round"
        ctx.lineJoin="round"
        var yOffset = 25
        $scope.places.forEach(function(place){
          var place_canvas = pos(place)
          ctx.font = "80px Roboto Slab";
          ctx.textAlign = "center";
          ctx.fillStyle = "black";
          ctx.fillText(place.name, place_canvas.x, place_canvas.y + yOffset);
          ctx.strokeStyle = "black";
          ctx.lineWidth = 25;
          ctx.strokeText(place.name, place_canvas.x, place_canvas.y + yOffset);
        })
        $scope.places.forEach(function(place){
          var place_canvas = pos(place)
          ctx.font = "80px Roboto Slab";
          ctx.textAlign = "center";
          ctx.fillStyle = "white";
          ctx.fillText(place.name, place_canvas.x, place_canvas.y + yOffset);
        })
      }

    }
  };
}]);
